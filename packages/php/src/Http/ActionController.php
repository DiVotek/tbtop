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
        $action = $resolved->s->collectedActions()[$tbtopAction] ?? null;
        $handler = $action?->handler();
        if ($action === null || $handler === null) {
            throw new NotFoundHttpException("Action \"{$tbtopAction}\" has no server handler on this page.");
        }

        $result = $handler(ActionCtx::fromRequest($request, ResolvedPage::routeParams($request)));

        return response()->json([
            'effects' => $result instanceof Effects ? $result : [],
        ]);
    }
}
