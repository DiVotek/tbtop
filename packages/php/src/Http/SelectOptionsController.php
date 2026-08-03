<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\Fields\Select;

/**
 * POST {page-path}/select-options/{tbtopField}
 *
 * Two modes, distinguished by request body:
 *   search mode  — body: {search: string}  → {options: [{value, label}]}
 *   resolve mode — body: {value: string}   → {option: {value, label}|null}
 *
 * Unlike relation-search this never touches Eloquent: the field's query()
 * closure owns the source, the filtering, and the result cap.
 */
final class SelectOptionsController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findQueryableSelect($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Select field \"{$fieldName}\" with query() is not defined on this page.",
            );
        }

        $deps = DependencyPayload::read($request, $field->dependsOnFields());

        if ($request->has('value')) {
            return $this->resolveByValue($request, $field, $deps);
        }

        return $this->search($request, $field, $deps);
    }

    /** @param  array<string, string>  $deps */
    private function search(Request $request, Select $field, array $deps): JsonResponse
    {
        $search = (string) $request->input('search', '');

        return response()->json([
            'options' => self::normalize(self::callQuery($field, $deps, $search)),
        ]);
    }

    /**
     * Label resolution order: the associative map the closure returned (when the
     * value is present), then resolveUsing(), then the raw value. Never throws —
     * a value the author cannot resolve is the author's concern, and failing the
     * whole form over a stale id would be worse than showing it.
     *
     * @param  array<string, string>  $deps
     */
    private function resolveByValue(Request $request, Select $field, array $deps): JsonResponse
    {
        $value = (string) $request->input('value', '');
        $label = self::labelFromMap(self::callQuery($field, $deps, ''), $value)
            ?? self::labelFromResolver($field, $value)
            ?? $value;

        return response()->json(['option' => ['value' => $value, 'label' => $label]]);
    }

    /**
     * @param  array<string, string>  $deps
     * @return array<array-key, mixed>
     */
    private static function callQuery(Select $field, array $deps, string $search): array
    {
        $closure = $field->queryClosure();

        // findQueryableSelect guarantees a query closure.
        assert($closure instanceof Closure);

        $rows = $closure($deps, $search);

        return is_array($rows) ? $rows : [];
    }

    /**
     * Only an associative value => label map can answer a resolve; a list of row
     * arrays is a search result the author already capped, so scanning it would
     * silently miss any value past that cap.
     *
     * @param  array<array-key, mixed>  $rows
     */
    private static function labelFromMap(array $rows, string $value): ?string
    {
        $label = $rows[$value] ?? null;

        return is_scalar($label) ? (string) $label : null;
    }

    private static function labelFromResolver(Select $field, string $value): ?string
    {
        $resolver = $field->resolveClosure();
        if ($resolver === null) {
            return null;
        }

        $label = $resolver($value);

        return is_scalar($label) ? (string) $label : null;
    }

    /**
     * Accepts either a list of ['value' => ..., 'label' => ...] rows or an
     * associative value => label map, and emits the wire shape for both.
     *
     * @param  array<array-key, mixed>  $rows
     * @return list<array{value: string, label: string}>
     */
    private static function normalize(array $rows): array
    {
        $out = [];
        foreach ($rows as $key => $row) {
            $option = is_array($row) ? self::rowOption($row) : self::mapOption($key, $row);
            if ($option !== null) {
                $out[] = $option;
            }
        }

        return $out;
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @return array{value: string, label: string}|null
     */
    private static function rowOption(array $row): ?array
    {
        $value = $row['value'] ?? null;
        if (! is_scalar($value)) {
            return null;
        }
        $label = $row['label'] ?? $value;

        return [
            'value' => (string) $value,
            'label' => is_scalar($label) ? (string) $label : (string) $value,
        ];
    }

    /** @return array{value: string, label: string}|null */
    private static function mapOption(string|int $key, mixed $label): ?array
    {
        if (! is_scalar($label)) {
            return null;
        }

        return ['value' => (string) $key, 'label' => (string) $label];
    }
}
