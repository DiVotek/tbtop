<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\RuleWalker;

/**
 * Checks a form's input before the handler runs: the form's rules alone would let an
 * agent-made upload value through, and would store a richtext document the editor cannot open.
 */
final class FormInput
{
    /**
     * An excluded field may come back with its stored value — an agent echoes a
     * repeater row from `values` whole; only a changed value is refused.
     *
     * @param  array<string, mixed>  $input
     */
    public static function assertSendable(FormBuilder $form, array $input): void
    {
        $changed = self::changedExcluded($form->getFields(), $input, $form->recordData(), '');
        if ($changed === []) {
            return;
        }
        $names = implode(', ', $changed);

        throw new AgentError("Fields listed in excludedFields cannot be changed over MCP; omit them or send their current value: {$names}.");
    }

    /**
     * The input keys of excluded fields whose value differs from the stored one, per repeater row.
     *
     * @param  list<Field>  $fields
     * @param  array<mixed>  $input
     * @param  array<mixed>  $stored
     * @return list<string>
     */
    private static function changedExcluded(array $fields, array $input, array $stored, string $prefix): array
    {
        $changed = [];
        foreach ($fields as $field) {
            if (! array_key_exists($field->name, $input)) {
                continue;
            }
            $key = $prefix.$field->name;
            $value = $input[$field->name];
            if (in_array($field->toNode()->kind, FormFields::UNSUPPORTED_KINDS, true)) {
                // Loose: ids decoded from JSON may differ in type from the cast record value.
                if ($value != ($stored[$field->name] ?? null)) {
                    $changed[] = $key;
                }

                continue;
            }
            if ($field instanceof Richtext) {
                self::assertDocuments($field, $key, $value);

                continue;
            }
            $children = RuleWalker::fields($field->childFields());
            $rows = is_array($stored[$field->name] ?? null) ? $stored[$field->name] : [];
            foreach ($children === [] || ! is_array($value) ? [] : $value as $i => $row) {
                if (is_array($row)) {
                    $was = is_array($rows[$i] ?? null) ? $rows[$i] : [];
                    $changed = [...$changed, ...self::changedExcluded($children, $row, $was, "{$key}.{$i}.")];
                }
            }
        }

        return $changed;
    }

    /** A translatable richtext holds one document per locale. */
    private static function assertDocuments(Richtext $field, string $key, mixed $value): void
    {
        if (! $field->isTranslatableField() || ! is_array($value)) {
            RichtextDocument::assertValid($key, $value);

            return;
        }
        foreach ($value as $locale => $document) {
            RichtextDocument::assertValid("{$key}.{$locale}", $document);
        }
    }
}
