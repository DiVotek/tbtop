<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;

final class ActionController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $tbtopAction = (string) $request->route('tbtopAction');
        $resolved = ResolvedPage::fromRequest($request);
        $action = $resolved->s->reachableAction($tbtopAction);
        $handler = $action?->handler();
        if ($handler === null) {
            throw new NotFoundHttpException("Action \"{$tbtopAction}\" has no server handler on this page.");
        }

        $gate = ($action->toNode()->options['spec']['validate'] ?? true) !== false;
        $ctx = ActionCtx::fromRequest($request, ResolvedPage::routeParams($request))
            ->withValidatedForm(self::validatedForm($request, $resolved, $tbtopAction, $gate));

        $result = $handler($ctx);

        return response()->json([
            'effects' => $result instanceof Effects ? $result : [],
        ]);
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
        $formName = ActionFormRules::enclosingFormName($resolved->tree, $actionName);
        $form = $formName === null ? null : $resolved->s->reachableForm($formName);
        if ($form === null) {
            return null;
        }
        $rules = $form->collectRules();
        if ($rules === []) {
            return null;
        }

        $validated = $gate
            ? $request->validate(
                self::scopedToPayload($rules),
                [],
                self::scopedToPayload($form->collectAttributes()),
            )
            : self::declaredKeysOnly($request->all(), self::scopedToPayload($rules));

        // validate() echoes the input's own shape back, so the data sits nested
        // under the payload key the rules addressed it through.
        $data = $validated['payload']['form'] ?? [];

        return is_array($data) ? $data : [];
    }

    /**
     * The keys $rules declares, lifted out of $input without running the gate.
     *
     * A rule key may carry wildcards (`payload.form.items.*.name`), so it is not
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

        $picked = [];
        foreach ($keys as $key) {
            if (! Arr::has($input, $key)) {
                continue;
            }
            // A container key (`items`, declared alongside `items.0.name`) must
            // not copy its raw subtree — that would smuggle in the very
            // undeclared members its child keys exist to select. Its children
            // rebuild it; it only has to exist so an empty repeater survives.
            if (! self::hasDeclaredDescendant($keys, $key)) {
                Arr::set($picked, $key, Arr::get($input, $key));

                continue;
            }
            if (! Arr::has($picked, $key)) {
                Arr::set($picked, $key, []);
            }
        }

        return $picked;
    }

    /** @param  list<string>  $keys */
    private static function hasDeclaredDescendant(array $keys, string $key): bool
    {
        foreach ($keys as $other) {
            if ($other !== $key && str_starts_with($other, $key.'.')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Form rules are keyed by field name, but an action ships its form under
     * `payload.form`, so every key needs that prefix to address the right input.
     *
     * @param  array<string, mixed>  $keyed
     * @return array<string, mixed>
     */
    private static function scopedToPayload(array $keyed): array
    {
        $scoped = [];
        foreach ($keyed as $key => $value) {
            $scoped["payload.form.{$key}"] = $value;
        }

        return $scoped;
    }
}
