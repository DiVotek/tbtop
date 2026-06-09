<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class TableController
{
    public function __invoke(Request $request): JsonResponse
    {
        $name = (string) $request->route('tbtopTable');
        $resolved = ResolvedPage::fromRequest($request);
        $table = $resolved->s->collectedTables()[$name] ?? null;
        $query = $table?->queryClosure();
        if ($table === null || $query === null) {
            throw new NotFoundHttpException("Table \"{$name}\" has no query on this page.");
        }

        return response()->json(['data' => TableQuery::run($table, $request, $query())]);
    }
}
