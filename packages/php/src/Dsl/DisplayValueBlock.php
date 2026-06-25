<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasCopyable;
use Tbtop\Admin\Http\KindFormat;

/**
 * Read-only display of a single value, formatted like a table column. Date/
 * money/number bake the formatted string into options.value; badge/boolean/
 * icon emit raw value + meta for the client (mirrors the table's column kinds).
 *
 * @method static self make(mixed $value)
 */
final class DisplayValueBlock implements JsonSerializable
{
    use HasCopyable;

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
        $meta = KindMetaBuilder::booleanMeta($trueIcon, $falseIcon, $trueColor, $falseColor);
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
        $clone->kindMeta['badge'] = KindMetaBuilder::badgeMeta($colors);

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
        foreach ($this->copyableOption() as $key => $value) {
            $options[$key] = $value;
        }

        return (new Node('displayValue', $options))->jsonSerialize();
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
