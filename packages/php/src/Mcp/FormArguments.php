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

    private const ALL_EXCLUDED = 'every field of its form is one MCP cannot fill (upload/media/richtext)';

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
        $rules = $form->collectRules();
        $fields = [];
        $excluded = [];
        $required = [];
        foreach ($form->getFields() as $field) {
            $node = $field->toNode();
            if (in_array($node->kind, self::UNSUPPORTED_KINDS, true)) {
                $excluded[] = ['name' => $field->name, 'kind' => $node->kind, 'reason' => "{$node->kind} fields cannot be filled over MCP"];
                if (self::isRequired($field->name, $rules)) {
                    $required[] = ['name' => $field->name, 'kind' => $node->kind];
                }

                continue;
            }
            $fields[] = [
                ...self::field($field, $node->kind, $node->options, $rules),
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

        return [$out, $required];
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
     * Refuses $input that sets a field describe() lists as excluded: the form's
     * rules would otherwise let an agent-made value through to the handler.
     *
     * @param  array<string, mixed>  $input
     */
    public static function assertSendable(FormBuilder $form, array $input): void
    {
        $sent = array_values(array_filter(
            $form->getFields(),
            static fn (Field $field): bool => array_key_exists($field->name, $input)
                && in_array($field->toNode()->kind, self::UNSUPPORTED_KINDS, true),
        ));
        if ($sent === []) {
            return;
        }
        $names = implode(', ', array_map(static fn (Field $field): string => $field->name, $sent));

        throw new AgentError("Fields listed in excludedFields cannot be sent over MCP; omit: {$names}.");
    }

    /**
     * @param  array<string, mixed>  $options
     * @param  array<string, list<string>>  $rules
     * @return array<string, mixed>
     */
    private static function field(Field $field, string $kind, array $options, array $rules): array
    {
        $name = $field->name;
        $nested = array_filter($rules, static fn (string $key): bool => str_starts_with($key, $name.'.'), ARRAY_FILTER_USE_KEY);

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
     * $field's choices as {value, label} with the value's own type, 'dynamic'
     * when query()'s options lookup serves them, null when free-form.
     *
     * @return list<array{value: mixed, label: string}>|string|null
     */
    public static function options(Field $field): array|string|null
    {
        return self::optionsOf($field, $field->toNode()->options);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return list<array{value: mixed, label: string}>|string|null
     */
    private static function optionsOf(Field $field, array $options): array|string|null
    {
        if (is_array($options['options'] ?? null)) {
            return array_map(
                static fn (array $option): array => ['value' => $option['value'] ?? null, 'label' => (string) ($option['label'] ?? '')],
                array_values($options['options']),
            );
        }

        return FieldOptions::isServed($field) ? 'dynamic' : null;
    }
}
