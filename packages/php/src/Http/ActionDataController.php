<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Serves a modal action's backend data query. The action's query closure runs
 * server-side with the row/selection context and returns arbitrary data the
 * modal body consumes (e.g. a record to prefill a form). Agnostic to "edit".
 */
final class ActionDataController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $name = (string) $request->route('tbtopAction');
        $resolved = ResolvedPage::fromRequest($request);
        $action = $resolved->s->reachableAction($name);
        $query = $action?->queryClosure();
        if ($query === null) {
            throw new NotFoundHttpException("Action \"{$name}\" has no data query on this page.");
        }

        $ctx = BulkSelection::ctx($request, $resolved, $name);

        return response()->json(['data' => $query($ctx)]);
    }
}
