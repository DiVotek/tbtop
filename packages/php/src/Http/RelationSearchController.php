<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST {page-path}/relation-search/{tbtopField}
 *
 * Two modes, distinguished by request body:
 *   search mode  — body: {search: string}  → {options: [{value, label}]}
 *   resolve mode — body: {value: string}   → {option: {value, label}|null}
 */
final class RelationSearchController
{
    use AuthorizesPage;

    private const RESULT_CAP = 50;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findRelationField($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Relation field \"{$fieldName}\" with query() is not defined on this page.",
            );
        }

        $labelKey = $field->getLabelKey();
        $closure = $field->queryClosure();

        // findRelationField only returns fields whose queryClosure() is non-null.
        assert($closure instanceof Closure);

        if ($request->has('value')) {
            return $this->resolveByValue($request, $closure, $labelKey);
        }

        return $this->search($request, $closure, $labelKey);
    }

    private function resolveByValue(Request $request, Closure $closure, string $labelKey): JsonResponse
    {
        $value = (string) $request->input('value', '');
        $builder = $closure();
        $model = $builder->find($value);

        if ($model === null) {
            return response()->json(['option' => null]);
        }

        return response()->json([
            'option' => [
                'value' => (string) $model->getKey(),
                'label' => (string) $model->{$labelKey},
            ],
        ]);
    }

    private function search(Request $request, Closure $closure, string $labelKey): JsonResponse
    {
        $search = (string) $request->input('search', '');
        $builder = $closure();

        if ($search !== '') {
            $builder = $builder->where($labelKey, 'like', '%'.$search.'%');
        }

        $rows = $builder->limit(self::RESULT_CAP)->get();

        $options = $rows->map(fn ($model) => [
            'value' => (string) $model->getKey(),
            'label' => (string) $model->{$labelKey},
        ])->values()->all();

        return response()->json(['options' => $options]);
    }
}
