<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\I18n\LocaleService;
use Tbtop\Admin\I18n\TranslatableValue;

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

        $deps = self::readDeps($request, $field->dependsOnFields());

        if ($request->has('value')) {
            return $this->resolveByValue($request, $field, $deps);
        }

        return $this->search($request, $field, $deps);
    }

    /** @param  array<string, string>  $deps */
    private function resolveByValue(Request $request, Relation $field, array $deps): JsonResponse
    {
        $value = (string) $request->input('value', '');
        $builder = $this->buildQuery($field, $deps);
        $model = $builder->find($value);

        if ($model === null) {
            return response()->json(['option' => null]);
        }

        return response()->json([
            'option' => self::toOption($model, $field->getLabelKey()),
        ]);
    }

    /** @param  array<string, string>  $deps */
    private function search(Request $request, Relation $field, array $deps): JsonResponse
    {
        $search = (string) $request->input('search', '');
        $builder = $this->buildQuery($field, $deps);
        $labelKey = $field->getLabelKey();

        if ($search !== '') {
            $builder = $builder->where(
                self::searchColumn($builder, $labelKey),
                'like',
                '%'.$search.'%',
            );
        }

        $rows = $builder->limit($field->getSearchLimit())->get();

        $options = $rows->map(fn ($model) => self::toOption($model, $labelKey))
            ->values()
            ->all();

        return response()->json(['options' => $options]);
    }

    /**
     * A translatable column stores a locale map, so LIKE against the whole JSON
     * text matches locale keys and misses non-ASCII values (stored escaped).
     * Searching the default locale's JSON path compares the decoded value.
     *
     * @param  Builder<Model>  $builder
     */
    private static function searchColumn(Builder $builder, string $labelKey): string
    {
        if (! self::isTranslatable($builder->getModel(), $labelKey)) {
            return $labelKey;
        }

        return $labelKey.'->'.LocaleService::defaultContentLocale();
    }

    private static function isTranslatable(Model $model, string $labelKey): bool
    {
        $translatable = $model->translatable ?? null;
        if (is_array($translatable) && in_array($labelKey, $translatable, true)) {
            return true;
        }

        return in_array($model->getCasts()[$labelKey] ?? null, ['array', 'json'], true);
    }

    /** @return array{value: string, label: string} */
    private static function toOption(Model $model, string $labelKey): array
    {
        $label = TranslatableValue::pick($model->getRawOriginal($labelKey) ?? $model->{$labelKey});

        return [
            'value' => (string) $model->getKey(),
            'label' => is_scalar($label) ? (string) $label : '',
        ];
    }

    /**
     * @param  array<string, string>  $deps
     * @return Builder<Model>
     */
    private function buildQuery(Relation $field, array $deps): Builder
    {
        $closure = $field->queryClosure();

        // findRelationField guarantees a query closure.
        assert($closure instanceof Closure);

        $builder = $closure($deps);
        assert($builder instanceof Builder);

        return $builder;
    }

    /**
     * @param  list<string>  $allowedFields
     * @return array<string, string>
     */
    private static function readDeps(Request $request, array $allowedFields): array
    {
        $deps = $request->input('deps', []);
        if (! is_array($deps) || $allowedFields === []) {
            return [];
        }

        $allowed = array_flip($allowedFields);
        $out = [];
        foreach ($deps as $key => $value) {
            if (! is_string($key) || ! array_key_exists($key, $allowed) || ! is_scalar($value)) {
                continue;
            }
            $out[$key] = (string) $value;
        }

        return $out;
    }
}
