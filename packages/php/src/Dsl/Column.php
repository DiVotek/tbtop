<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;

/**
 * Fluent column descriptor for TableBuilder.
 *
 * One class — no per-kind hierarchy.  Kind-sugar methods (date, datetime,
 * number, money, boolean, badge, iconMap) set ->kind() and store format
 * metadata; the actual value transformation happens in ColumnProjection.
 *
 * Sparse serialization: only non-default / explicitly-set keys are emitted
 * so the client wire stays compact.
 */
final class Column implements JsonSerializable
{
    private ?string $label = null;

    private ?string $kind = null;

    private ?bool $sortable = null;

    private ?bool $searchable = null;

    private ?bool $toggleable = null;

    private bool $hiddenByDefault = false;

    private ?string $align = null;

    /** @var array{name: string, position: string}|null */
    private ?array $icon = null;

    private ?string $width = null;

    /** null = not set, true = wrap, false = truncate */
    private ?bool $wrap = null;

    private ?string $tooltip = null;

    private ?bool $translatable = null;

    private ?Closure $formatUsing = null;

    /** Extra kind-specific payload (badge, boolean, iconMap, format, decimals, currency…). */
    /** @var array<string, mixed> */
    private array $kindMeta = [];

    /**
     * Server-only: true = always hidden (never serialized / never projected).
     * Null = use $visibleClosure result (default visible).
     */
    private bool $alwaysHidden = false;

    private ?Closure $visibleClosure = null;

    public function __construct(public readonly string $name) {}

    public static function make(string $name): static
    {
        return new self($name);
    }

    // -------------------------------------------------------------------------
    // Fluent API
    // -------------------------------------------------------------------------

    public function label(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function kind(string $kind): static
    {
        $this->kind = $kind;

        return $this;
    }

    public function sortable(bool $sortable = true): static
    {
        $this->sortable = $sortable;

        return $this;
    }

    public function searchable(bool $searchable = true): static
    {
        $this->searchable = $searchable;

        return $this;
    }

    public function toggleable(bool $toggleable = true, bool $hiddenByDefault = false): static
    {
        $this->toggleable = $toggleable;
        $this->hiddenByDefault = $hiddenByDefault;

        return $this;
    }

    public function hidden(): static
    {
        $this->alwaysHidden = true;

        return $this;
    }

    /**
     * Pass a closure returning bool; false → column excluded from wire & projection.
     */
    public function visible(Closure $closure): static
    {
        $this->visibleClosure = $closure;

        return $this;
    }

    /** @param  'left'|'center'|'right'  $align */
    public function align(string $align): static
    {
        $this->align = $align;

        return $this;
    }

    /** @param  'left'|'right'  $position */
    public function icon(string $name, string $position = 'left'): static
    {
        $this->icon = ['name' => $name, 'position' => $position];

        return $this;
    }

    public function width(string $width): static
    {
        $this->width = $width;

        return $this;
    }

    public function wrap(): static
    {
        $this->wrap = true;

        return $this;
    }

    public function truncate(): static
    {
        $this->wrap = false;

        return $this;
    }

    public function tooltip(string $tooltip): static
    {
        $this->tooltip = $tooltip;

        return $this;
    }

    public function translatable(bool $value = true): static
    {
        $this->translatable = $value;

        return $this;
    }

    public function formatUsing(Closure $fn): static
    {
        $this->formatUsing = $fn;

        return $this;
    }

    // -------------------------------------------------------------------------
    // Kind sugar
    // -------------------------------------------------------------------------

    public function date(?string $format = null): static
    {
        $this->kind = 'date';
        if ($format !== null) {
            $this->kindMeta['format'] = $format;
        }

        return $this;
    }

    public function datetime(?string $format = null): static
    {
        $this->kind = 'datetime';
        if ($format !== null) {
            $this->kindMeta['format'] = $format;
        }

        return $this;
    }

    public function number(?int $decimals = null): static
    {
        $this->kind = 'number';
        if ($decimals !== null) {
            $this->kindMeta['decimals'] = $decimals;
        }

        return $this;
    }

    public function money(string $currency): static
    {
        $this->kind = 'money';
        $this->kindMeta['currency'] = $currency;

        return $this;
    }

    public function boolean(
        ?string $trueIcon = null,
        ?string $falseIcon = null,
        Color|string|null $trueColor = null,
        Color|string|null $falseColor = null,
    ): static {
        $this->kind = 'boolean';
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
            $this->kindMeta['boolean'] = $meta;
        }

        return $this;
    }

    /**
     * @param  array<string, Color|string>  $colors  value → Color|string
     */
    public function badge(array $colors): static
    {
        $this->kind = 'badge';
        $mapped = [];
        foreach ($colors as $value => $color) {
            $mapped[$value] = $color instanceof Color ? $color->value : $color;
        }
        $this->kindMeta['badge'] = ['colors' => $mapped];

        return $this;
    }

    /**
     * @param  array<string, array{icon: string, color?: string}|string>  $map  value → ['icon', 'color'] or icon string
     */
    public function iconMap(array $map): static
    {
        $this->kind = 'icon';
        $this->kindMeta['iconMap'] = $map;

        return $this;
    }

    // -------------------------------------------------------------------------
    // Server-side visibility
    // -------------------------------------------------------------------------

    /**
     * Returns true when the column should be included in the wire and projection.
     */
    public function isVisible(): bool
    {
        if ($this->alwaysHidden) {
            return false;
        }
        if ($this->visibleClosure !== null) {
            return (bool) ($this->visibleClosure)();
        }

        return true;
    }

    public function isSortable(): bool
    {
        return $this->sortable === true;
    }

    public function isSearchable(): bool
    {
        return $this->searchable === true;
    }

    public function isTranslatable(): bool
    {
        return $this->translatable === true;
    }

    public function getFormatUsing(): ?Closure
    {
        return $this->formatUsing;
    }

    /** @return array<string, mixed> The kind-specific format metadata (format, decimals, currency…). */
    public function getKindMeta(): array
    {
        return $this->kindMeta;
    }

    public function getKind(): ?string
    {
        return $this->kind;
    }

    // -------------------------------------------------------------------------
    // Serialization
    // -------------------------------------------------------------------------

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $out = ['name' => $this->name];

        if ($this->label !== null) {
            $out['label'] = $this->label;
        }
        if ($this->kind !== null) {
            $out['kind'] = $this->kind;
        }
        if ($this->sortable !== null) {
            $out['sortable'] = $this->sortable;
        }
        if ($this->searchable !== null) {
            $out['searchable'] = $this->searchable;
        }
        if ($this->toggleable !== null) {
            $out['toggleable'] = $this->toggleable;
            if ($this->hiddenByDefault) {
                $out['hiddenByDefault'] = true;
            }
        }
        if ($this->align !== null) {
            $out['align'] = $this->align;
        }
        if ($this->icon !== null) {
            $out['icon'] = $this->icon;
        }
        if ($this->width !== null) {
            $out['width'] = $this->width;
        }
        if ($this->wrap !== null) {
            $out['wrap'] = $this->wrap;
        }
        if ($this->tooltip !== null) {
            $out['tooltip'] = $this->tooltip;
        }
        if ($this->translatable === true) {
            $out['translatable'] = true;
        }

        // Kind-specific metadata: format, decimals, currency, badge, boolean, iconMap
        foreach ($this->kindMeta as $key => $value) {
            $out[$key] = $value;
        }

        return $out;
    }
}
