<?php

namespace Tbtop\Admin\Dsl;

final class RuleWalker
{
    /**
     * Walks a structure tree collecting Laravel rules from FieldBuilders.
     * Repeater sub-fields become `parent.*.child` rules.
     *
     * @param  list<mixed>  $children
     * @return array<string, list<string>>
     */
    public static function collect(array $children, string $prefix = ''): array
    {
        $rules = [];
        foreach ($children as $child) {
            foreach (self::fromChild($child, $prefix) as $key => $entry) {
                $rules[$key] = $entry;
            }
        }

        return $rules;
    }

    /** @return array<string, list<string>> */
    private static function fromChild(mixed $child, string $prefix): array
    {
        if ($child instanceof FieldBuilder) {
            return self::fromField($child, $prefix);
        }
        if ($child instanceof Node) {
            $nested = $child->options['children'] ?? $child->options['fields'] ?? [];

            return is_array($nested) ? self::collect(array_values($nested), $prefix) : [];
        }

        return [];
    }

    /** @return array<string, list<string>> */
    private static function fromField(FieldBuilder $field, string $prefix): array
    {
        $key = $prefix.$field->name;
        // Rule-less fields get a permissive baseline so validate()
        // still includes them in the validated payload.
        $entries = $field->ruleEntries();
        $rules = [$key => $entries === [] ? ['nullable'] : $entries];
        $subFields = $field->childFields();
        if ($subFields !== []) {
            $rules += self::collect($subFields, $key.'.*.');
        }

        return $rules;
    }
}
