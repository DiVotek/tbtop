<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;

final class FormSubmitController
{
    use AuthorizesPage;

    public function __invoke(Request $request): RedirectResponse
    {
        $this->authorizePageGate($request);

        $tbtopForm = (string) $request->route('tbtopForm');
        $resolved = ResolvedPage::fromRequest($request);
        $form = $resolved->s->collectedForms()[$tbtopForm] ?? null;
        $handler = $form?->submitHandler();
        if ($form === null || $handler === null) {
            throw new NotFoundHttpException("Form \"{$tbtopForm}\" is not submittable on this page.");
        }

        $validated = $request->validate($form->collectRules());
        $ctx = new ActionCtx(
            request: $request,
            user: $request->user(),
            form: $validated,
            params: ResolvedPage::routeParams($request),
        );
        $result = $handler($ctx);

        if (is_string($result)) {
            return redirect($result);
        }

        return back()->with('tbtop.effects', $result instanceof Effects ? $result->jsonSerialize() : []);
    }
}
