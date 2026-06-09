<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class DataController
{
    public function __invoke(Request $request): JsonResponse
    {
        $name = (string) $request->route('tbtopData');
        $resolved = ResolvedPage::fromRequest($request);
        $chart = $resolved->s->collectedCharts()[$name] ?? null;
        $query = $chart?->queryClosure();
        if ($chart === null || $query === null) {
            throw new NotFoundHttpException("Data source \"{$name}\" is not defined on this page.");
        }

        return response()->json(['data' => $query($request)]);
    }
}
