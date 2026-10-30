<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationRuleParser;

/**
 * The messages a rule renders for a field, so assertHasErrors(['title' =>
 * 'required']) can match an error the wire carries only as text. Size rules
 * render per type (string, numeric, array, file); every variant counts.
 *
 * @internal
 */
final class RuleMessages
{
    /** @return list<string> */
    public static function for(string $field, string $rule, ?string $label): array
    {
        [$name, $parameters] = ValidationRuleParser::parse($rule);
        if (! is_string($name) || $name === '') {
            return [];
        }
        $validator = Validator::make([], [], [], $label === null ? [] : [$field => $label]);
        $key = Str::snake($name);
        $messages = [];
        foreach (["validation.custom.{$field}.{$key}", "validation.{$key}"] as $line) {
            $raw = trans($line);
            foreach (is_array($raw) ? $raw : [$raw] as $variant) {
                if (is_string($variant) && $variant !== $line) {
                    $messages[] = $validator->makeReplacements($variant, $field, $name, $parameters);
                }
            }
        }

        return $messages;
    }
}
