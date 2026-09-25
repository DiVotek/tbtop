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

    /** @return array{form: string, fields: list<array<string, mixed>>, excludedFields?: list<array<string, string>>} */
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
            $fields[] = self::field($field->name, $node->kind, $field->labelText(), $node->options, $rules);
        }

        $out = ['form' => $form->name, 'fields' => $fields];
        if ($excluded !== []) {
            $out['excludedFields'] = $excluded;
        }

        return $out;
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
     * $field's choices: value => label, 'dynamic' when fetched per search, null when free-form.
     *
     * @return array<string, string>|string|null
     */
    public static function options(Field $field): array|string|null
    {
        $node = $field->toNode();

        return self::optionsOf($node->kind, $node->options);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, string>|string|null
     */
    private static function optionsOf(string $kind, array $options): array|string|null
    {
        if (is_array($options['options'] ?? null)) {
            $out = [];
            foreach ($options['options'] as $option) {
                $out[(string) ($option['value'] ?? '')] = (string) ($option['label'] ?? '');
            }

            return $out;
        }
        if (($options['async'] ?? false) === true || $kind === 'relation') {
            return 'dynamic';
        }

        return null;
    }
}
