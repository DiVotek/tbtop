<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\ChartBuilder;
use Tbtop\Admin\Dsl\Fields\Field;

final class DataController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $name = (string) $request->route('tbtopData');
        $resolved = ResolvedPage::fromRequest($request);

        $chart = $resolved->s->collectedCharts()[$name] ?? null;
        if ($chart !== null) {
            return $this->chartResponse($chart, $request);
        }

        $stat = $resolved->s->collectedStats()[$name] ?? null;
        $query = $stat?->queryClosure();
        if ($stat !== null && $query !== null) {
            return response()->json(['data' => $query()]);
        }

        throw new NotFoundHttpException("Data source \"{$name}\" is not defined on this page.");
    }

    private function chartResponse(ChartBuilder $chart, Request $request): JsonResponse
    {
        $query = $chart->queryClosure();
        if ($query === null) {
            throw new NotFoundHttpException("Data source \"{$chart->name}\" is not defined on this page.");
        }

        $params = $this->resolveParams($chart->paramFields(), $request);

        return response()->json(['data' => $query($request, $params)]);
    }

    /**
     * Build the param bag: only declared param names, query-string value or default.
     *
     * @param  list<Field>  $fields
     * @return array<string, mixed>
     */
    private function resolveParams(array $fields, Request $request): array
    {
        $bag = [];
        foreach ($fields as $field) {
            $bag[$field->name] = $request->query($field->name, $field->defaultValue());
        }

        return $bag;
    }
}
