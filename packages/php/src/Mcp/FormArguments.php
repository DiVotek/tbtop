<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\FormBuilder;

/**
 * Describes a form's input for an agent: kind, label, options and Laravel rules
 * per field. Described, not schematised — the server validates (adr/mcp.md).
 */
final class FormArguments
{
    /** Kinds whose value is a server-side upload or editor state an agent cannot produce. */
    private const UNSUPPORTED_KINDS = ['upload', 'media', 'richtext'];

    /**
     * `values` are the form's current data as the UI prefills it — an edit that
     * omits a field may clear it, depending on the page's handler.
     *
     * @return array{form: string, fields: list<array<string, mixed>>, excludedFields?: list<array<string, string>>, values?: array<string, mixed>}
     */
    public static function describe(FormBuilder $form): array
    {
        $rules = $form->collectRules();
        $fields = [];
        $excluded = [];
        foreach ($form->getFields() as $field) {
            $node = $field->toNode();
            if (in_array($node->kind, self::UNSUPPORTED_KINDS, true)) {
                $excluded[] = ['name' => $field->name, 'kind' => $node->kind, 'reason' => "{$node->kind} fields cannot be filled over MCP"];

                continue;
            }
            $fields[] = [
                ...self::field($field->name, $node->kind, $field->labelText(), $node->options, $rules),
                ...($field->isTranslatableField() ? ['translatable' => true] : []),
            ];
        }

        $out = ['form' => $form->name, 'fields' => $fields];
        if ($excluded !== []) {
            $out['excludedFields'] = $excluded;
        }
        $shown = array_column(array_filter($fields, static fn (array $f): bool => $f['kind'] !== 'password'), 'name');
        $values = array_intersect_key($form->recordData(), array_flip($shown));
        if ($values !== []) {
            $out['values'] = $values;
        }

        return $out;
    }

    /** A form whose every field is excluded cannot be submitted over MCP. @param  array<string, mixed>  $described  describe() output */
    public static function isFillable(array $described): bool
    {
        return $described['fields'] !== [] || ! isset($described['excludedFields']);
    }

    /**
     * @param  array<string, mixed>  $options
     * @param  array<string, list<string>>  $rules
     * @return array<string, mixed>
     */
    private static function field(string $name, string $kind, ?string $label, array $options, array $rules): array
    {
        $nested = array_filter($rules, static fn (string $key): bool => str_starts_with($key, $name.'.'), ARRAY_FILTER_USE_KEY);

        return array_filter([
            'name' => $name,
            'kind' => $kind,
            'label' => $label,
            'rules' => $rules[$name] ?? [],
            'nestedRules' => $nested,
            'options' => self::optionsOf($kind, $options),
        ], static fn (mixed $v): bool => $v !== null && $v !== []);
    }

    /**
     * $field's choices as {value, label} with the value's own type, 'dynamic'
     * when fetched per search, null when free-form.
     *
     * @return list<array{value: mixed, label: string}>|string|null
     */
    public static function options(Field $field): array|string|null
    {
        $node = $field->toNode();

        return self::optionsOf($node->kind, $node->options);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return list<array{value: mixed, label: string}>|string|null
     */
    private static function optionsOf(string $kind, array $options): array|string|null
    {
        if (is_array($options['options'] ?? null)) {
            return array_map(
                static fn (array $option): array => ['value' => $option['value'] ?? null, 'label' => (string) ($option['label'] ?? '')],
                array_values($options['options']),
            );
        }
        if (($options['async'] ?? false) === true || $kind === 'relation') {
            return 'dynamic';
        }

        return null;
    }
}
