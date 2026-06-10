<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
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

        // Native Inertia flash: re-delivered per response (shared props are
        // deduped by preserveEqualProps on identical consecutive submits)
        // and excluded from history state (no toast replay on back-nav).
        Inertia::flash('tbtop.effects', $result instanceof Effects ? $result->jsonSerialize() : []);

        return back();
    }
}
