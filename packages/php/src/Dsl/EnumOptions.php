<?php

namespace Tbtop\Admin\Dsl;

use BackedEnum;
use Illuminate\Contracts\Support\Htmlable;
use InvalidArgumentException;
use Tbtop\Admin\Contracts\HasColor;
use Tbtop\Admin\Contracts\HasDescription;
use Tbtop\Admin\Contracts\HasLabel;
use UnitEnum;

/**
 * Expands an enum class into the badge maps and option lists the wire already
 * carries. Keys are the stored value: ->value for a backed enum, ->name for a
 * pure one (what an Eloquent enum cast serializes to). Labels fall back to the
 * case name (also when getLabel() is null or empty); a case without a color
 * gets none (gray on the client).
 */
final class EnumOptions
{
    /** The stored scalar of a case: ->value for a backed enum, ->name for a pure one. */
    public static function scalar(UnitEnum $case): int|string
    {
        return $case instanceof BackedEnum ? $case->value : $case->name;
    }

    /** The wire key / option value for a case: its scalar as a string. */
    public static function key(UnitEnum $case): string
    {
        return (string) self::scalar($case);
    }

    /**
     * Badge entries keyed by the wire key: every case has a label, a color only
     * when the enum implements HasColor and returns one.
     *
     * @return array<string, array{label: string, color?: string}>
     */
    public static function badgeEntries(string $enumClass): array
    {
        $entries = [];
        foreach (self::cases($enumClass) as $case) {
            $entry = ['label' => self::label($case)];
            $color = self::color($case);
            if ($color !== null) {
                $entry['color'] = $color;
            }
            $entries[self::key($case)] = $entry;
        }

        return $entries;
    }

    /**
     * The {value, label, description?} option list; description only when the
     * enum implements HasDescription and returns one.
     *
     * @return list<array{value: string, label: string, description?: string}>
     */
    public static function options(string $enumClass): array
    {
        $options = [];
        foreach (self::cases($enumClass) as $case) {
            $option = ['value' => self::key($case), 'label' => self::label($case)];
            $description = $case instanceof HasDescription ? $case->getDescription() : null;
            if ($description !== null) {
                $option['description'] = self::text($description);
            }
            $options[] = $option;
        }

        return $options;
    }

    /**
     * The {value, label} list an inline-select column renders (no description).
     *
     * @return list<array{value: string, label: string}>
     */
    public static function selectOptions(string $enumClass): array
    {
        return array_map(
            fn (UnitEnum $case) => ['value' => self::key($case), 'label' => self::label($case)],
            self::cases($enumClass),
        );
    }

    /** @return list<UnitEnum> */
    private static function cases(string $enumClass): array
    {
        if (! enum_exists($enumClass)) {
            throw new InvalidArgumentException("\"{$enumClass}\" is not an enum class.");
        }

        return $enumClass::cases();
    }

    private static function label(UnitEnum $case): string
    {
        $label = $case instanceof HasLabel ? $case->getLabel() : null;
        $text = $label === null ? '' : self::text($label);

        return $text === '' ? $case->name : $text;
    }

    private static function color(UnitEnum $case): ?string
    {
        $color = $case instanceof HasColor ? $case->getColor() : null;
        if (is_array($color)) {
            throw new InvalidArgumentException(sprintf(
                'Enum %s::%s: getColor() returned an array (a color palette); badges take a color name (Color|string).',
                $case::class,
                $case->name,
            ));
        }

        return $color instanceof Color ? $color->value : $color;
    }

    private static function text(string|Htmlable $value): string
    {
        return $value instanceof Htmlable
            ? html_entity_decode(strip_tags($value->toHtml()), ENT_QUOTES | ENT_HTML5)
            : $value;
    }
}
