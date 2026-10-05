<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\RuleWalker;

/**
 * Describes a field list for an agent. A container's children follow it under their
 * full rule name (`sections.*.title`), so an agent reads them as it reads top-level fields.
 */
final class FormFields
{
    /** Kinds whose value is a server-side upload an agent cannot produce. */
    public const UNSUPPORTED_KINDS = ['upload', 'media'];

    /**
     * $fields as RuleWalker::fieldsByKey() keys them. An excluded field counts as
     * required only when its row must exist: at the top level, or in a container
     * that is required or has a minimum row count.
     *
     * @param  array<string, Field>  $fields
     * @param  array<string, list<mixed>>  $rules
     * @return array{fields: list<array<string, mixed>>, excluded: list<array<string, string>>, required: list<array<string, string>>}
     */
    public static function describe(array $fields, array $rules): array
    {
        $out = ['fields' => [], 'excluded' => [], 'required' => []];
        $rowMandatory = [];
        foreach ($fields as $name => $field) {
            $parent = str_contains($name, '.*.') ? substr($name, 0, (int) strrpos($name, '.*.')) : null;
            $mandatory = $parent === null || ($rowMandatory[$parent] ?? false);
            $node = $field->toNode();
            if (in_array($node->kind, self::UNSUPPORTED_KINDS, true)) {
                $out['excluded'][] = ['name' => $name, 'kind' => $node->kind, 'reason' => "{$node->kind} fields cannot be filled over MCP"];
                if ($mandatory && self::isRequired($name, $rules)) {
                    $out['required'][] = ['name' => $name, 'kind' => $node->kind];
                }

                continue;
            }
            $rowMandatory[$name] = $mandatory && (in_array('required', $rules[$name] ?? [], true) || (int) ($node->options['minItems'] ?? 0) > 0);
            $isContainer = array_any(array_keys($fields), static fn (string $key): bool => str_starts_with($key, "{$name}.*."));
            $out['fields'][] = [
                ...self::field($field, $name, $node->kind, $node->options, $rules, ! $isContainer),
                ...($field->isTranslatableField() ? ['translatable' => true] : []),
                ...($field instanceof Richtext ? self::richtext($field) : []),
            ];
        }

        return $out;
    }

    /**
     * $field's choices as {value, label} with the value's own type, 'dynamic'
     * when query()'s options lookup serves them, null when free-form.
     *
     * @param  array<string, mixed>  $options
     * @return list<array{value: mixed, label: string}>|string|null
     */
    public static function optionsOf(Field $field, array $options): array|string|null
    {
        if (is_array($options['options'] ?? null)) {
            return array_map(
                static fn (array $option): array => ['value' => $option['value'] ?? null, 'label' => (string) ($option['label'] ?? '')],
                array_values($options['options']),
            );
        }

        return FieldOptions::isServed($field) ? 'dynamic' : null;
    }

    /**
     * Whether a key of $name (`name` itself or `name.*`, `name.en`) holds the
     * string rule `required` without `sometimes` on that same key — checked per
     * key, as a multiple upload puts `required` on `name` and `sometimes` on
     * `name.*`. Rule objects and the required_if family do not count.
     *
     * @param  array<string, list<mixed>>  $rules
     */
    private static function isRequired(string $name, array $rules): bool
    {
        foreach ($rules as $key => $list) {
            $own = $key === $name || str_starts_with($key, $name.'.');
            if ($own && in_array('required', $list, true) && ! in_array('sometimes', $list, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * A container's nested rules are its children's, described as fields of their own.
     *
     * @param  array<string, mixed>  $options
     * @param  array<string, list<mixed>>  $rules
     * @return array<string, mixed>
     */
    private static function field(Field $field, string $name, string $kind, array $options, array $rules, bool $withNested): array
    {
        $nested = $withNested
            ? array_filter($rules, static fn (string $key): bool => str_starts_with($key, $name.'.'), ARRAY_FILTER_USE_KEY)
            : [];

        return array_filter([
            'name' => $name,
            'kind' => $kind,
            'label' => $field->labelText(),
            'rules' => $rules[$name] ?? [],
            'nestedRules' => $nested,
            'mask' => is_string($options['mask'] ?? null) ? $options['mask'] : null,
            'dependsOn' => is_array($options['dependsOn'] ?? null) ? array_values($options['dependsOn']) : null,
            'options' => self::optionsOf($field, $options),
        ], static fn (mixed $v): bool => $v !== null && $v !== []);
    }

    /**
     * The node types a document may hold, and each embed kind with the fields of its `data`.
     *
     * @return array{nodes: list<string>, embeds?: list<array<string, mixed>>}
     */
    private static function richtext(Richtext $field): array
    {
        $embeds = [];
        foreach ($field->getEmbeds() as $embed) {
            $fields = $embed->includedFields();
            $described = self::describe(RuleWalker::fieldsByKey($fields), RuleWalker::collect($fields));
            $embeds[] = array_filter([
                'kind' => $embed->kind,
                'label' => $embed->labelText(),
                'fields' => $described['fields'],
                'excludedFields' => $described['excluded'],
            ], static fn (mixed $v): bool => $v !== []);
        }

        return ['nodes' => RichtextDocument::nodeTypes(), ...($embeds === [] ? [] : ['embeds' => $embeds])];
    }
}
