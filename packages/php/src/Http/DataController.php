<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\ChartBuilder;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\RuleWalker;

final class DataController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $name = (string) $request->route('tbtopData');
        $resolved = ResolvedPage::fromRequest($request);

        $chart = $resolved->s->reachableChart($name);
        if ($chart !== null) {
            return $this->chartResponse($chart, $request);
        }

        $stat = $resolved->s->reachableStat($name);
        $query = $stat?->queryClosure();
        if ($stat !== null && $query !== null) {
            return response()->json(['data' => $query($this->resolveParams($stat->paramFields(), $request))]);
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
     * Build the param bag: only declared param names, query-string value or
     * default (also for an empty value), held to each field's rules() and to a scalar value — the values
     * come from the query string, so a failing one answers 422 before the closure runs.
     *
     * @param  list<Field>  $fields
     * @return array<string, mixed>
     */
    private function resolveParams(array $fields, Request $request): array
    {
        $bag = [];
        foreach ($fields as $field) {
            $value = $request->query($field->name);
            // A cleared control sends `name=` (null after ConvertEmptyStringsToNull): fall back to the default.
            $bag[$field->name] = $value === null || $value === '' ? $field->defaultValue() : $value;
        }
        $rules = RuleWalker::collect($fields);
        foreach (array_keys($bag) as $name) {
            $rules[$name] = [...$rules[$name] ?? [], self::scalarRule(...)];
        }
        Validator::make($bag, $rules)->validate();

        return $bag;
    }

    /** A param control sends one string; `?period[]=x` is not a param value. */
    private static function scalarRule(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_array($value)) {
            $fail("The {$attribute} param must be a single value.");
        }
    }
}
