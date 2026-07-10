<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Upload;

final class RuleWalker
{
    /**
     * Walks a structure tree collecting Laravel validation rules from fields.
     * Accepts Field instances.
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
        if ($child instanceof Field) {
            return self::fromField($child, $prefix);
        }
        if ($child instanceof Node) {
            return self::collect($child->nestedChildren(), $prefix);
        }

        return [];
    }

    /** @param  Field  $field @return array<string, list<string>> */
    private static function fromField(Field $field, string $prefix): array
    {
        if ($field instanceof Upload && $field->isTranslatableField()) {
            return self::fromTranslatableUploadField($field, $prefix);
        }
        if ($field->isTranslatableField()) {
            return self::fromTranslatableField($field, $prefix);
        }
        if ($field instanceof Select && $field->isMultiple()) {
            return self::fromMultipleSelectField($field, $prefix);
        }
        if ($field instanceof Upload) {
            return self::fromUploadField($field, $prefix);
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
     * Multiple-select: field key gets `array` + field-level rules;
     * element key (`field.*`) gets element-level rules.
     *
     * @return array<string, list<string>>
     */
    private static function fromMultipleSelectField(Select $field, string $prefix): array
    {
        // Field-level: array constraints; element-level: everything else.
        $fieldLevel = ['required', 'nullable', 'array', 'min', 'max', 'size', 'between', 'distinct', 'present'];
        $key = $prefix.$field->name;
        $allEntries = $field->ruleEntries();

        $fieldRules = ['array'];
        $elementRules = [];

        foreach ($allEntries as $entry) {
            $name = str_contains($entry, ':') ? substr($entry, 0, strpos($entry, ':')) : $entry;
            if (in_array($name, $fieldLevel, true)) {
                if ($entry !== 'array') {
                    $fieldRules[] = $entry;
                }
            } else {
                $elementRules[] = $entry;
            }
        }

        $rules = [$key => $fieldRules];
        if ($elementRules !== []) {
            $rules[$key.'.*'] = $elementRules;
        }

        return $rules;
    }

    /**
     * Upload values are path strings. Single upload defaults to
     * `nullable|string`; multiple splits field-level rules (`array`, `max`,
     * `required`, …) from element-level rules (`string` + anything else).
     * Auto-injects `max:{maxFiles}` for multiple uploads when not declared.
     *
     * @return array<string, list<string>>
     */
    private static function fromUploadField(Upload $field, string $prefix): array
    {
        $key = $prefix.$field->name;
        $entries = $field->ruleEntries();

        if (! $field->isMultiple()) {
            return [$key => self::singleUploadRules($entries)];
        }

        return self::multipleUploadRules($field, $key, $entries);
    }

    /**
     * @return array<string, list<string>>
     */
    private static function fromTranslatableUploadField(Upload $field, string $prefix): array
    {
        $key = $prefix.$field->name;
        $locales = self::contentLocales();
        $default = self::defaultContentLocale($locales);
        $fieldRules = $field->ruleEntries();
        $overrides = $field->localeRuleEntries();
        $rules = [$key => ['nullable', 'array']];

        foreach ($locales as $locale) {
            $dotKey = "{$key}.{$locale}";
            $entries = $overrides[$locale] ?? ($locale === $default ? $fieldRules : ['nullable']);
            if (! $field->isMultiple()) {
                $rules[$dotKey] = self::singleUploadRules($entries);

                continue;
            }
            $rules += self::multipleUploadRules($field, $dotKey, $entries);
        }

        return $rules;
    }

    /**
     * @param  list<string>  $entries
     * @return array<string, list<string>>
     */
    private static function multipleUploadRules(Upload $field, string $key, array $entries): array
    {
        $fieldLevel = ['required', 'nullable', 'array', 'min', 'max', 'size', 'between', 'distinct', 'present'];
        $fieldRules = ['array'];
        $elementRules = ['string'];
        $hasMax = false;

        foreach ($entries as $entry) {
            $name = str_contains($entry, ':') ? substr($entry, 0, strpos($entry, ':')) : $entry;
            if (in_array($name, $fieldLevel, true)) {
                if ($entry !== 'array') {
                    $fieldRules[] = $entry;
                }
                if ($name === 'max') {
                    $hasMax = true;
                }
            } else {
                $elementRules[] = $entry;
            }
        }

        if (! $hasMax) {
            $maxFiles = $field->toNode()->options['maxFiles'] ?? null;
            if (is_int($maxFiles)) {
                $fieldRules[] = "max:{$maxFiles}";
            }
        }

        return [
            $key => $fieldRules,
            $key.'.*' => $elementRules,
        ];
    }

    /**
     * @param  list<string>  $entries
     * @return list<string>
     */
    private static function singleUploadRules(array $entries): array
    {
        if ($entries === []) {
            return ['nullable', 'string'];
        }
        if (in_array('string', $entries, true)) {
            return $entries;
        }

        return [...$entries, 'string'];
    }

    /**
     * Expand a translatable field into per-locale dotted rules.
     * Default locale gets the field's own rules; others get 'nullable' baseline
     * unless overridden via rulesForLocale().
     *
     * @return array<string, list<string>>
     */
    private static function fromTranslatableField(Field $field, string $prefix): array
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
