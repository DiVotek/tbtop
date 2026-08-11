<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $ctx = ActionCtx::fromRequest($request, ResolvedPage::routeParams($request))
            ->withValidatedForm(self::validatedForm($request, $resolved, $tbtopAction));

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
     * @return array<string, mixed>|null
     */
    private static function validatedForm(Request $request, ResolvedPage $resolved, string $actionName): ?array
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

        $validated = $request->validate(
            self::scopedToPayload($rules),
            [],
            self::scopedToPayload($form->collectAttributes()),
        );

        // validate() echoes the input's own shape back, so the data sits nested
        // under the payload key the rules addressed it through.
        $data = $validated['payload']['form'] ?? [];

        return is_array($data) ? $data : [];
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
