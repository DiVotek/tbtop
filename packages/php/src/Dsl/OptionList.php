<?php

namespace Tbtop\Admin\Dsl;

/**
 * Shared option-value normalization for the value primitives that emit a
 * {value, label} list (Select / Radio fields, editable select columns).
 *
 * Wire contract: option values are strings — form data and URL params are.
 * Casting here keeps the field and column wire shapes identical.
 */
final class OptionList
{
    /**
     * @param  list<array{value: mixed, label: string}>  $options
     * @return list<array{value: string, label: string}>
     */
    public static function normalize(array $options): array
    {
        return array_map(
            fn (array $option) => ['value' => (string) $option['value']] + $option,
            $options,
        );
    }
}
