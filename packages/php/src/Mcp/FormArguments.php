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
    private const ALL_EXCLUDED = 'every field of its form is one MCP cannot fill (upload/media)';

    /**
     * `values` are the form's current data as the UI prefills it — an edit that
     * omits a field may clear it, depending on the page's handler.
     *
     * @return array{form: string, fields: list<array<string, mixed>>, excludedFields?: list<array<string, string>>, values?: array<string, mixed>}
     */
    public static function describe(FormBuilder $form): array
    {
        return self::analyse($form)[0];
    }

    /**
     * Why an executable submitting $form cannot pass over MCP, or null when it
     * can: every field is excluded, or — when the executable validates the
     * form — an excluded field is required.
     */
    public static function unfillableReason(FormBuilder $form, bool $validated): ?string
    {
        [$described, $required] = self::analyse($form);
        if ($described['fields'] === [] && isset($described['excludedFields'])) {
            return self::ALL_EXCLUDED;
        }
        if (! $validated || $required === []) {
            return null;
        }
        $names = implode(', ', array_map(static fn (array $f): string => "\"{$f['name']}\"", $required));
        $kinds = implode(', ', array_unique(array_column($required, 'kind')));

        return count($required) === 1
            ? "field {$names} is required and cannot be filled over MCP ({$kinds})"
            : "fields {$names} are required and cannot be filled over MCP ({$kinds})";
    }

    /**
     * describe()'s output plus the excluded fields whose rules require a value.
     *
     * @return array{0: array{form: string, fields: list<array<string, mixed>>, excludedFields?: list<array<string, string>>, values?: array<string, mixed>}, 1: list<array<string, string>>}
     */
    private static function analyse(FormBuilder $form): array
    {
        $described = FormFields::describe($form->getFields(), $form->collectRules());
        $out = ['form' => $form->name, 'fields' => $described['fields']];
        if ($described['excluded'] !== []) {
            $out['excludedFields'] = $described['excluded'];
        }
        $shown = array_column(array_filter($described['fields'], static fn (array $f): bool => $f['kind'] !== 'password'), 'name');
        $values = array_intersect_key($form->recordData(), array_flip($shown));
        if ($values !== []) {
            $out['values'] = $values;
        }

        return [$out, $described['required']];
    }

    /**
     * $field's choices as {value, label} with the value's own type, 'dynamic'
     * when query()'s options lookup serves them, null when free-form.
     *
     * @return list<array{value: mixed, label: string}>|string|null
     */
    public static function options(Field $field): array|string|null
    {
        return FormFields::optionsOf($field, $field->toNode()->options);
    }
}
