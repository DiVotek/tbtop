<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\ChildInclusion;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\StructureWalk;

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
        foreach (self::topLevelFields($form->toNode()) as $field) {
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
            'options' => self::options($kind, $options),
        ], static fn (mixed $v): bool => $v !== null && $v !== []);
    }

    /**
     * Static options as value => label; 'dynamic' when the list is fetched per search.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, string>|string|null
     */
    private static function options(string $kind, array $options): array|string|null
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

    /**
     * Fields as the form submits them: a container field (repeater, keyvalue)
     * is one entry — its sub-fields show up in its nestedRules.
     *
     * @return list<Field>
     */
    private static function topLevelFields(mixed $node): array
    {
        if ($node instanceof Field) {
            return [$node];
        }
        $out = [];
        foreach (StructureWalk::descendants($node) as $child) {
            if (ChildInclusion::isConditionMet($child)) {
                $out = [...$out, ...self::topLevelFields($child)];
            }
        }

        return $out;
    }
}
