<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tbtop\Admin\Dsl\Fields\Select;
use Traversable;

final class SelectOptionsResponder
{
    public function respond(Request $request, Select $field): JsonResponse
    {
        $deps = DependencyPayload::read($request, $field->dependsOnFields());

        if ($request->has('values')) {
            return $this->resolveByValues($request, $field, $deps);
        }

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

    /** @param  array<string, string>  $deps */
    private function resolveByValue(Request $request, Select $field, array $deps): JsonResponse
    {
        $value = (string) $request->input('value', '');
        $rows = self::callQuery($field, $deps, '');

        return response()->json(['option' => self::resolveOne($field, $rows, $value)]);
    }

    /** @param  array<string, string>  $deps */
    private function resolveByValues(Request $request, Select $field, array $deps): JsonResponse
    {
        $values = $request->input('values');
        $rows = self::callQuery($field, $deps, '');

        $options = [];
        foreach (is_array($values) ? $values : [] as $value) {
            if (is_scalar($value)) {
                $options[] = self::resolveOne($field, $rows, (string) $value);
            }
        }

        return response()->json(['options' => $options]);
    }

    /**
     * @param  array<array-key, mixed>  $rows
     * @return array{value: string, label: string, display?: mixed}
     */
    private static function resolveOne(Select $field, array $rows, string $value): array
    {
        $resolved = self::optionFromMap($rows, $value)
            ?? self::optionFromResolver($field, $value)
            ?? ['label' => $value];

        return array_merge($resolved, ['value' => $value]);
    }

    /**
     * Keyed lookup only: scanning a capped search result could silently assign
     * a positional neighbour's label to a stored value.
     *
     * @param  array<array-key, mixed>  $rows
     * @return array{label: string, display?: mixed}|null
     */
    private static function optionFromMap(array $rows, string $value): ?array
    {
        $row = $rows[$value] ?? null;
        if (is_scalar($row)) {
            return ['label' => (string) $row];
        }

        if (! is_array($row) || (string) ($row['value'] ?? '') !== $value) {
            return null;
        }

        return self::readOption($row, $value);
    }

    /** @return array{label: string, display?: mixed}|null */
    private static function optionFromResolver(Select $field, string $value): ?array
    {
        $resolver = $field->resolveClosure();
        if ($resolver === null) {
            return null;
        }

        $resolved = $resolver($value);
        if (is_scalar($resolved)) {
            return ['label' => (string) $resolved];
        }

        return is_array($resolved) ? self::readOption($resolved, $value) : null;
    }

    /**
     * @param  array<array-key, mixed>  $row
     * @return array{label: string, display?: mixed}
     */
    private static function readOption(array $row, string $fallback): array
    {
        $label = $row['label'] ?? $fallback;
        $option = ['label' => is_scalar($label) ? (string) $label : $fallback];
        if (isset($row['display']) && is_array($row['display'])) {
            $option['display'] = $row['display'];
        }

        return $option;
    }

    /**
     * @param  array<string, string>  $deps
     * @return array<array-key, mixed>
     */
    private static function callQuery(Select $field, array $deps, string $search): array
    {
        $closure = $field->queryClosure();
        assert($closure instanceof Closure);

        return self::toRows($closure($deps, $search));
    }

    /** @return array<array-key, mixed> */
    private static function toRows(mixed $rows): array
    {
        if ($rows instanceof Arrayable) {
            $rows = $rows->toArray();
        } elseif ($rows instanceof Traversable) {
            $rows = iterator_to_array($rows);
        }

        return is_array($rows) ? $rows : [];
    }

    /**
     * @param  array<array-key, mixed>  $rows
     * @return list<array{value: string, label: string, display?: mixed}>
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
     * Query rows are often full models. Only the option protocol's allowlisted
     * fields may reach the browser.
     *
     * @param  array<array-key, mixed>  $row
     * @return array{value: string, label: string, display?: mixed}|null
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
            ...is_array($row['display'] ?? null) ? ['display' => $row['display']] : [],
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
