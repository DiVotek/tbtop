<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;
use Tbtop\Admin\Http\KindFormat;

/**
 * Read-only display of a single value, formatted like a table column.
 *
 * The author passes the value directly (not a binding). Kind-sugar mirrors
 * Column's kind-model: badge / boolean / icon / money / date / datetime /
 * number. For money/date/datetime/number the formatted string is baked into
 * options.value server-side (via the shared KindFormat); for badge/boolean/
 * icon the raw value + format meta are emitted and the client renders them
 * (mirrors how the table defers those to the client).
 *
 * @method static self make(mixed $value)
 */
final class DisplayValueBlock implements JsonSerializable
{
    private ?string $kind = null;

    /** @var array<string, mixed> */
    private array $kindMeta = [];

    private function __construct(private readonly mixed $value) {}

    public static function make(mixed $value): self
    {
        return new self($value);
    }

    // -------------------------------------------------------------------------
    // Kind sugar (bodies mirror Column.php)
    // -------------------------------------------------------------------------

    public function date(?string $format = null): self
    {
        $clone = clone $this;
        $clone->kind = 'date';
        if ($format !== null) {
            $clone->kindMeta['format'] = $format;
        }

        return $clone;
    }

    public function datetime(?string $format = null): self
    {
        $clone = clone $this;
        $clone->kind = 'datetime';
        if ($format !== null) {
            $clone->kindMeta['format'] = $format;
        }

        return $clone;
    }

    public function number(?int $decimals = null): self
    {
        $clone = clone $this;
        $clone->kind = 'number';
        if ($decimals !== null) {
            $clone->kindMeta['decimals'] = $decimals;
        }

        return $clone;
    }

    public function money(string $currency): self
    {
        $clone = clone $this;
        $clone->kind = 'money';
        $clone->kindMeta['currency'] = $currency;

        return $clone;
    }

    public function boolean(
        ?string $trueIcon = null,
        ?string $falseIcon = null,
        Color|string|null $trueColor = null,
        Color|string|null $falseColor = null,
    ): self {
        $clone = clone $this;
        $clone->kind = 'boolean';
        $meta = [];
        if ($trueIcon !== null) {
            $meta['trueIcon'] = $trueIcon;
        }
        if ($falseIcon !== null) {
            $meta['falseIcon'] = $falseIcon;
        }
        if ($trueColor !== null) {
            $meta['trueColor'] = $trueColor instanceof Color ? $trueColor->value : $trueColor;
        }
        if ($falseColor !== null) {
            $meta['falseColor'] = $falseColor instanceof Color ? $falseColor->value : $falseColor;
        }
        if ($meta !== []) {
            $clone->kindMeta['boolean'] = $meta;
        }

        return $clone;
    }

    /**
     * @param  array<string, Color|string>  $colors  value → Color|string
     */
    public function badge(array $colors): self
    {
        $clone = clone $this;
        $clone->kind = 'badge';
        $mapped = [];
        foreach ($colors as $value => $color) {
            $mapped[$value] = $color instanceof Color ? $color->value : $color;
        }
        $clone->kindMeta['badge'] = ['colors' => $mapped];

        return $clone;
    }

    /**
     * @param  array<string, array{icon: string, color?: string}|string>  $map  value → ['icon', 'color'] or icon string
     */
    public function icon(array $map): self
    {
        $clone = clone $this;
        $clone->kind = 'icon';
        $clone->kindMeta['iconMap'] = $map;

        return $clone;
    }

    // -------------------------------------------------------------------------
    // Serialization
    // -------------------------------------------------------------------------

    /**
     * Client-render meta keys. Format keys (currency/format/decimals) are NOT
     * emitted: the value is already baked formatted, so they'd be dead weight.
     */
    private const CLIENT_META_KEYS = ['badge', 'boolean', 'iconMap'];

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $options = ['value' => $this->displayValue()];
        if ($this->kind !== null) {
            $options['kind'] = $this->kind;
        }
        foreach (self::CLIENT_META_KEYS as $key) {
            if (isset($this->kindMeta[$key])) {
                $options[$key] = $this->kindMeta[$key];
            }
        }

        return ['kind' => 'displayValue', 'options' => $options, 'meta' => new stdClass];
    }

    /**
     * Bake the formatted string for date/datetime/number/money; leave the raw
     * value for badge/boolean/icon (the client renders those).
     */
    private function displayValue(): mixed
    {
        return KindFormat::apply($this->kind ?? '', $this->kindMeta, $this->value);
    }
}
