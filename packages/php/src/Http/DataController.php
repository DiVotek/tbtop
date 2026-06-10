<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\FieldBuilder;
use Tbtop\Admin\Dsl\Fields\Field;

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

        $params = $this->resolveParams($chart->paramFields(), $request);

        return response()->json(['data' => $query($request, $params)]);
    }

    /**
     * Build the param bag: only declared param names, query-string value or default.
     *
     * @param  list<Field|FieldBuilder>  $fields
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
