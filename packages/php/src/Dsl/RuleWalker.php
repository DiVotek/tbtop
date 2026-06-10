<?php

namespace Tbtop\Admin\Dsl;

final class RuleWalker
{
    /**
     * Walks a structure tree collecting Laravel rules from FieldBuilders.
     * Repeater sub-fields become `parent.*.child` rules.
     * Translatable fields become `field.locale` dotted rules per locale.
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
        if ($field->isTranslatableField()) {
            return self::fromTranslatableField($field, $prefix);
        }

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

    /**
     * Expand a translatable field into per-locale dotted rules.
     * Default locale gets the field's own rules; others get 'nullable' baseline
     * unless overridden via rulesForLocale().
     *
     * @return array<string, list<string>>
     */
    private static function fromTranslatableField(FieldBuilder $field, string $prefix): array
    {
        $key = $prefix.$field->name;
        $locales = self::contentLocales();
        $default = self::defaultContentLocale($locales);
        $fieldRules = $field->ruleEntries();
        $overrides = $field->localeRuleEntries();
        $rules = [$key => ['nullable', 'array']];

        foreach ($locales as $locale) {
            $dotKey = "{$key}.{$locale}";
            if (isset($overrides[$locale])) {
                $rules[$dotKey] = $overrides[$locale];
            } elseif ($locale === $default) {
                $rules[$dotKey] = $fieldRules === [] ? ['nullable'] : $fieldRules;
            } else {
                $rules[$dotKey] = ['nullable'];
            }
        }

        return $rules;
    }

    /** @return list<string> */
    private static function contentLocales(): array
    {
        return array_values((array) config('tbtop-admin.content_locales', ['en']));
    }

    private static function defaultContentLocale(array $locales): string
    {
        $configured = (string) config('tbtop-admin.default_content_locale', '');
        if ($configured !== '' && in_array($configured, $locales, true)) {
            return $configured;
        }

        return $locales[0] ?? 'en';
    }
}
