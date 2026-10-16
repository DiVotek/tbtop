<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\RuleWalker;
use Tbtop\Admin\Validation\EmbedsRule;

final class ActionController
{
    use AuthorizesPage;
    use RespondsWithEffects;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $tbtopAction = (string) $request->route('tbtopAction');
        $resolved = ResolvedPage::fromRequest($request);
        if ($tbtopAction === EmbedApply::ACTION) {
            return EmbedApply::respond($request, $resolved->s);
        }
        $action = $resolved->s->reachableAction($tbtopAction);
        $handler = $action?->handler();
        if ($handler === null) {
            throw new NotFoundHttpException("Action \"{$tbtopAction}\" has no server handler on this page.");
        }

        $gate = ! $action->skipsFormValidation();
        $ctx = ActionCtx::fromRequest($request, ResolvedPage::routeParams($request))
            ->withValidatedForm(self::validatedForm($request, $resolved, $tbtopAction, $gate));

        $result = $handler($ctx);

        return $this->respondWithEffects($result, Effects::make());
    }

    /**
     * Validated form payload, or null when this action has no form to validate
     * against — the handler then reads the raw payload and validates it itself.
     *
     * Mirrors FormSubmitController: rules come from the form the action submits
     * into, and only declared keys survive.
     *
     * With $gate off (->withoutValidation()) the rules still select which keys
     * reach the handler, but a failing field no longer blocks the action.
     *
     * @return array<string, mixed>|null
     */
    private static function validatedForm(Request $request, ResolvedPage $resolved, string $actionName, bool $gate): ?array
    {
        $form = ActionFormRules::enclosingForm($resolved, $actionName);
        if ($form === null) {
            return null;
        }
        $rules = $form->collectRules();
        if ($rules === []) {
            return null;
        }

        $input = $request->input('payload.form', []);
        $input = is_array($input) ? $input : [];

        if (! $gate) {
            return self::declaredKeysOnly($input, $rules);
        }
        $fields = $form->getFields();
        if (RuleWalker::hasUploadPaths($fields)) {
            $rules = RuleWalker::bindUploadPaths($rules, $fields, $form->recordData(), ...self::modalRecord($request, $resolved, $actionName));
        }
        $validator = Validator::make($input, $rules, [], $form->collectAttributes());

        return EmbedsRule::applyDeclaredKeys($validator->getRules(), $validator->validate());
    }

    /**
     * The record a modal form was loaded with: the enclosing modal's query()
     * re-run for this submit's row/selection. The data endpoint already serves
     * the same closure the same payload, so its upload paths are ones the
     * submitter can see anyway. Empty when there is no such query, or the
     * submit lacks a payload source the query reads.
     *
     * @return list<array<string, mixed>>
     */
    private static function modalRecord(Request $request, ResolvedPage $resolved, string $actionName): array
    {
        $action = ActionFormRules::enclosingQueryAction($resolved, $actionName);
        $query = $action?->queryClosure();
        if ($action === null || $query === null) {
            return [];
        }
        foreach ($action->getQueryNeeds() as $need) {
            if (! $request->filled("payload.{$need}")) {
                return [];
            }
        }
        $data = $query(ActionCtx::fromRequest($request, ResolvedPage::routeParams($request)));
        $data = $data instanceof Arrayable ? $data->toArray() : $data;

        return is_array($data) ? [$data] : [];
    }

    /**
     * The keys $rules declares, lifted out of $input without running the gate.
     *
     * A rule key may carry wildcards (`items.*.name`), so it is not
     * a literal path. Validator::getRules() expands those against the data being
     * validated, which is what makes each repeater row addressable — hence
     * building a validator and reading its rules back rather than walking
     * $rules directly. Values are taken as-is, failures included: the handler
     * asked for the form's shape, not its verdict.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    private static function declaredKeysOnly(array $input, array $rules): array
    {
        $keys = array_keys(Validator::make($input, $rules)->getRules());
        $containers = self::declaredContainers($keys);

        $picked = [];
        foreach ($keys as $key) {
            if (! Arr::has($input, $key)) {
                continue;
            }
            // A container key (`items`, declared alongside `items.0.name`) must
            // not copy its raw subtree — that would smuggle in the very
            // undeclared members its child keys exist to select. Its children
            // rebuild it; it only has to exist so an empty repeater survives.
            if (! isset($containers[$key])) {
                Arr::set($picked, $key, Arr::get($input, $key));

                continue;
            }
            if (! Arr::has($picked, $key)) {
                Arr::set($picked, $key, []);
            }
        }

        return $picked;
    }

    /**
     * Every declared key that is also an ancestor of another declared key.
     *
     * Collected in one pass: a repeater emits a key per row, so testing each
     * key against the whole set would scale with the square of the row count —
     * and row count is browser-supplied on this path.
     *
     * @param  list<string>  $keys
     * @return array<string, true>
     */
    private static function declaredContainers(array $keys): array
    {
        $containers = [];
        foreach ($keys as $key) {
            $pos = strrpos($key, '.');
            while ($pos !== false) {
                $key = substr($key, 0, $pos);
                $containers[$key] = true;
                $pos = strrpos($key, '.');
            }
        }

        return $containers;
    }
}
