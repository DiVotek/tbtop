<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\CollectsRules;
use Tbtop\Admin\Dsl\Concerns\HasCopyable;
use Tbtop\Admin\Validation\ConstraintMap;

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
    use CollectsRules;
    use HasCopyable;

    private ?string $label = null;

    private ?string $kind = null;

    private ?bool $sortable = null;

    /** Server-only: sortBy() target field — never serialized. */
    private ?string $sortByField = null;

    /** Server-only: sortUsing() closure — never serialized. */
    private ?Closure $sortUsingClosure = null;

    private ?bool $searchable = null;

    private ?bool $individuallySearchable = null;

    private ?bool $toggleable = null;

    private bool $hiddenByDefault = false;

    private ?string $align = null;

    /** @var array{name: string, position: string}|null */
    private ?array $icon = null;

    private ?string $width = null;

    /** null = not set, true = wrap, false = truncate */
    private ?bool $wrap = null;

    private ?bool $noWrap = null;

    private ?string $tooltip = null;

    /** Server-only: per-row tooltip resolver — never serialized. Receives the row, returns a scalar or null. */
    private ?Closure $tooltipResolver = null;

    private ?string $description = null;

    /** Server-only: per-row description resolver — never serialized. Receives the row, returns a scalar or null. */
    private ?Closure $descriptionResolver = null;

    /** Renders the cell text as an emphasized primary-colored link-style label. */
    private ?bool $emphasized = null;

    /** Renders the cell text small and muted (secondary metadata columns). */
    private ?bool $muted = null;

    /** Renders the cell text uppercase with wide tracking. */
    private ?bool $uppercase = null;

    private ?bool $translatable = null;

    private ?Closure $formatUsing = null;

    /** Server-only: url resolver for the 'link' kind — never serialized. Receives the row, returns a URL or null. */
    private ?Closure $linkResolver = null;

    /** Extra kind-specific payload (badge, boolean, iconMap, format, decimals, currency…). */
    /** @var array<string, mixed> */
    private array $kindMeta = [];

    /** @var array<string, JsonSerializable> Display nodes rendered around the value (prefix/suffix), in display and edit mode alike. */
    private array $affixes = [];

    /**
     * Server-only: true = always hidden (never serialized / never projected).
     * Null = use $visibleClosure result (default visible).
     */
    private bool $alwaysHidden = false;

    private ?Closure $visibleClosure = null;

    // -------------------------------------------------------------------------
    // Editable-column state (server-side; onSaveClosure never serialized)
    // -------------------------------------------------------------------------

    /** 'boolean' | 'text' | 'select' | 'number' | null */
    private ?string $editAs = null;

    /** @var array{step?: int|float|string} Editor attributes, serialized as editable.input. */
    private array $editInput = [];

    /** @var list<array{value: string, label?: string}> Static options for an editable select column. */
    private array $editOptions = [];

    /** @var list<string> Laravel validation rules */
    private array $editRules = [];

    /** REQUIRED when editable — consumer provides the save logic. */
    private ?Closure $onSaveClosure = null;

    public function __construct(public readonly string $name) {}

    public static function make(string $name): static
    {
        return new self($name);
    }

    // -------------------------------------------------------------------------
    // Fluent API
    // -------------------------------------------------------------------------

    /** Column header text; defaults to a humanized $name when unset. */
    public function label(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    /** Raw kind string; prefer a dedicated kind method (money(), badge(), image(), ...) when one exists. */
    public function kind(string $kind): static
    {
        $this->kind = $kind;

        return $this;
    }

    /** Allow the user to sort the table by this column. */
    public function sortable(bool $sortable = true): static
    {
        $this->sortable = $sortable;

        return $this;
    }

    /**
     * Server-only: sort by a different field than the column name when this
     * column is sorted. $field may be a dot-path to a related column (e.g.
     * "contact.full_name") — resolved via a correlated subquery, no JOIN.
     * Ignored when sortUsing() is also set (sortUsing wins). Never serialized.
     */
    public function sortBy(string $field): static
    {
        $this->sortByField = $field;

        return $this;
    }

    /**
     * Server-only: full control over the ORDER BY when this column is sorted.
     * Wins over sortBy(). fn(Builder $query, string $direction): void|Builder
     * — $direction is already validated to 'asc'|'desc'. Never serialized.
     */
    public function sortUsing(Closure $fn): static
    {
        $this->sortUsingClosure = $fn;

        return $this;
    }

    /** Server-only: the sortBy() target field, or null when not set. */
    public function sortByField(): ?string
    {
        return $this->sortByField;
    }

    /** Server-only: the sortUsing() closure, or null when not set. */
    public function sortUsingClosure(): ?Closure
    {
        return $this->sortUsingClosure;
    }

    /** Include this column in the table's global search. See TableBuilder::searchable() for how column- and table-level search combine. */
    public function searchable(bool $searchable = true): static
    {
        $this->searchable = $searchable;

        return $this;
    }

    /** Enable a per-column search input in the table toolbar/header. */
    public function individuallySearchable(bool $value = true): static
    {
        $this->individuallySearchable = $value;

        return $this;
    }

    /**
     * Lets the user show/hide this column via the column-visibility dropdown.
     * $hiddenByDefault only sets the initial state — the column still ships
     * on the wire and the user can re-enable it. Contrast with hidden(),
     * which excludes the column from the wire entirely and no UI can undo it.
     */
    public function toggleable(bool $toggleable = true, bool $hiddenByDefault = false): static
    {
        $this->toggleable = $toggleable;
        $this->hiddenByDefault = $hiddenByDefault;

        return $this;
    }

    /** Excludes the column from the wire and from projection entirely — no client UI can bring it back. */
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

    /** Horizontal alignment of the cell content and header. @param  'left'|'center'|'right'  $align */
    public function align(string $align): static
    {
        $this->align = $align;

        return $this;
    }

    /**
     * A fixed icon shown beside every cell value (kebab-case Lucide name).
     * For an icon that varies with the value, use iconMap() instead.
     *
     * @param  'left'|'right'  $position
     */
    public function icon(string $name, string $position = 'left'): static
    {
        $this->icon = ['name' => $name, 'position' => $position];

        return $this;
    }

    /** Column width as a CSS length (e.g. '120px', '10%'). */
    public function width(string $width): static
    {
        $this->width = $width;

        return $this;
    }

    // wrap/truncate/noWrap are three mutually exclusive line-break modes sharing
    // two wire keys, so each setter clears the others: the last call wins.
    /** Allow cell content to wrap onto multiple lines. Mutually exclusive with truncate()/noWrap() — last call wins. */
    public function wrap(): static
    {
        $this->wrap = true;
        $this->noWrap = null;

        return $this;
    }

    /** Truncate overflowing cell content with an ellipsis. Mutually exclusive with wrap()/noWrap() — last call wins. */
    public function truncate(): static
    {
        $this->wrap = false;
        $this->noWrap = null;

        return $this;
    }

    /** Prevent cell content from wrapping (single line, may overflow). Mutually exclusive with wrap()/truncate() — last call wins. */
    public function noWrap(bool $value = true): static
    {
        $this->noWrap = $value;
        if ($value) {
            $this->wrap = null;
        }

        return $this;
    }

    /**
     * String → static tooltip, serialized as-is. Closure → per-row resolver,
     * run server-side in ColumnProjection and never serialized (mirrors
     * link()'s linkResolver pattern).
     */
    public function tooltip(string|Closure $tooltip): static
    {
        if ($tooltip instanceof Closure) {
            $this->tooltipResolver = $tooltip;

            return $this;
        }
        $this->tooltip = $tooltip;

        return $this;
    }

    /** Server-only: per-row tooltip resolver, or null when tooltip() wasn't called with a closure. */
    public function tooltipResolver(): ?Closure
    {
        return $this->tooltipResolver;
    }

    /**
     * Muted secondary line under the cell's primary content. String → static
     * description, serialized as-is. Closure → per-row resolver, run
     * server-side in ColumnProjection and never serialized (mirrors tooltip()).
     */
    public function description(string|Closure $description): static
    {
        if ($description instanceof Closure) {
            $this->descriptionResolver = $description;

            return $this;
        }
        $this->description = $description;

        return $this;
    }

    /** Server-only: per-row description resolver, or null when description() wasn't called with a closure. */
    public function descriptionResolver(): ?Closure
    {
        return $this->descriptionResolver;
    }

    /** Read the cell value from the record's per-locale map for the active locale, instead of a scalar. */
    public function translatable(bool $value = true): static
    {
        $this->translatable = $value;

        return $this;
    }

    /** Style the cell text as an emphasized primary link-style label (e.g. a title column driving rowClick). */
    public function emphasized(bool $value = true): static
    {
        $this->emphasized = $value;

        return $this;
    }

    /** Style the cell text small and muted — for secondary metadata columns (dates, parents, counts). */
    public function muted(bool $value = true): static
    {
        $this->muted = $value;

        return $this;
    }

    /** Style the cell text uppercase with wide tracking — for short code-like values (types, statuses). */
    public function uppercase(bool $value = true): static
    {
        $this->uppercase = $value;

        return $this;
    }

    /**
     * Server-side formatter, fn(mixed $value, Model|object $row): mixed, run in
     * ColumnProjection per row ($row is the raw row, before this column's own
     * value is written back). Runs INSTEAD OF kind-sugar formatting
     * (date/datetime/number/money), not in addition — set a kind for wire
     * metadata (align, filter type) if needed, but formatUsing() alone decides
     * the displayed value.
     *
     * Unsupported together with an editable column
     * (toggle()/textInput()/numberInput()/selectColumn()): ColumnProjection
     * skips formatting for editable cells so the inline editor gets the raw
     * stored value, which makes formatUsing() silently never run.
     * Serialization throws in that case — use prefix()/suffix() for a unit
     * or decoration instead.
     */
    public function formatUsing(Closure $fn): static
    {
        $this->formatUsing = $fn;

        return $this;
    }

    // -------------------------------------------------------------------------
    // Kind sugar
    // -------------------------------------------------------------------------

    /** Kind sugar: sets kind = 'date' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'Y-m-d'. */
    public function date(?string $format = null): static
    {
        $this->kind = 'date';
        if ($format !== null) {
            $this->kindMeta['format'] = $format;
        }

        return $this;
    }

    /** Kind sugar: sets kind = 'datetime' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'Y-m-d H:i:s'. */
    public function datetime(?string $format = null): static
    {
        $this->kind = 'datetime';
        if ($format !== null) {
            $this->kindMeta['format'] = $format;
        }

        return $this;
    }

    /** Kind sugar: sets kind = 'time' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'H:i'. */
    public function time(?string $format = null): static
    {
        $this->kind = 'time';
        if ($format !== null) {
            $this->kindMeta['format'] = $format;
        }

        return $this;
    }

    /** Kind sugar: sets kind = 'number' and stores $decimals; formatting (number_format) is applied server-side by KindFormat, not here. Omitting $decimals leaves the raw value unformatted. */
    public function number(?int $decimals = null): static
    {
        $this->kind = 'number';
        if ($decimals !== null) {
            $this->kindMeta['decimals'] = $decimals;
        }

        return $this;
    }

    /**
     * Money kind: takes the stored value in MINOR units (integer cents),
     * divides by 100 and appends $currency — store 1999, not 19.99. Output
     * only: for an inline-editable decimal amount use
     * numberInput()->step('0.01')->suffix('USD'), and on forms
     * number()->step('0.01')->prefix('$') with conversion in onSubmit.
     */
    public function money(string $currency): static
    {
        $this->kind = 'money';
        $this->kindMeta['currency'] = $currency;

        return $this;
    }

    /** Kind sugar: sets kind = 'boolean' with optional icon/color overrides for true/false; the client renders the icon, no server formatting involved. */
    public function boolean(
        ?string $trueIcon = null,
        ?string $falseIcon = null,
        Color|string|null $trueColor = null,
        Color|string|null $falseColor = null,
    ): static {
        $this->kind = 'boolean';
        $meta = KindMetaBuilder::booleanMeta($trueIcon, $falseIcon, $trueColor, $falseColor);
        if ($meta !== []) {
            $this->kindMeta['boolean'] = $meta;
        }

        return $this;
    }

    /**
     * Render the cell as a colored badge; sets kind = 'badge'. A value with no
     * entry in $colors still renders (gray/default badge styling), it just
     * doesn't get its own color.
     *
     * @param  array<string, Color|string>  $colors  value → Color|string
     */
    public function badge(array $colors): static
    {
        $this->kind = 'badge';
        $this->kindMeta['badge'] = KindMetaBuilder::badgeMeta($colors);

        return $this;
    }

    /**
     * Render the cell as an icon keyed by value; sets kind = 'icon'. A value
     * with no entry in $map falls back to rendering the raw value as text.
     *
     * @param  array<string, array{icon: string, color?: string}|string>  $map  value → ['icon', 'color'] or icon string
     */
    public function iconMap(array $map): static
    {
        $this->kind = 'icon';
        $this->kindMeta['iconMap'] = $map;

        return $this;
    }

    /** Render the column value as a thumbnail image; sets kind = 'image'. */
    public function image(): static
    {
        $this->kind = 'image';

        return $this;
    }

    /** Render the column value as a color swatch; sets kind = 'color'. */
    public function color(): static
    {
        $this->kind = 'color';

        return $this;
    }

    /**
     * Render the column as a link. $url receives the row (the Eloquent model,
     * or the stdClass for DB::table() rows) and returns a URL or null (null →
     * empty cell). Never serialized. Like every kind method, exclusive with the
     * other kinds — the last one called wins.
     */
    public function link(Closure $url, bool $external = false, ?string $icon = null): static
    {
        $this->kind = 'link';
        $this->linkResolver = $url;
        $meta = array_filter(
            ['external' => $external ? true : null, 'icon' => $icon],
            fn ($v) => $v !== null,
        );
        if ($meta !== []) {
            $this->kindMeta['link'] = $meta;
        }

        return $this;
    }

    /** Server-only: url resolver for the 'link' kind, or null when link() wasn't called. */
    public function linkResolver(): ?Closure
    {
        return $this->linkResolver;
    }

    /** Square shape (sharp corners). Last shape call wins. */
    public function square(): static
    {
        $this->kindMeta['shape'] = 'square';

        return $this;
    }

    /** Circular shape. Last shape call wins. */
    public function circular(): static
    {
        $this->kindMeta['shape'] = 'circular';

        return $this;
    }

    /** Rounded-corner shape. Last shape call wins. */
    public function rounded(): static
    {
        $this->kindMeta['shape'] = 'rounded';

        return $this;
    }

    /** Alt text for the image thumbnail. */
    public function alt(string $alt): static
    {
        $this->kindMeta['alt'] = $alt;

        return $this;
    }

    // -------------------------------------------------------------------------
    // Editable-column fluent API
    // -------------------------------------------------------------------------

    /**
     * Make the column an inline boolean toggle; sets kind = 'boolean'.
     * Incompatible with formatUsing() — throws at serialization.
     */
    public function toggle(): static
    {
        $this->editAs = 'boolean';
        $this->kind = 'boolean';

        return $this;
    }

    /**
     * Make the column an inline text input; sets kind = 'text' when no kind
     * is already set. Incompatible with formatUsing() — throws at serialization.
     */
    public function textInput(): static
    {
        $this->editAs = 'text';
        $this->kind ??= 'text';

        return $this;
    }

    /**
     * Make the column an inline (sync) select; sets kind = 'select' when no
     * kind is already set. Incompatible with formatUsing() — throws at serialization.
     */
    public function selectColumn(): static
    {
        $this->editAs = 'select';
        $this->kind ??= 'select';

        return $this;
    }

    /**
     * Make the column an inline number input; sets kind = 'number' when no
     * kind is already set. The cell ships the stored value raw (no
     * number_format) so the editor can round-trip it; add prefix()/suffix()
     * for a unit and step() for decimals. Incompatible with formatUsing() —
     * throws at serialization.
     */
    public function numberInput(): static
    {
        $this->editAs = 'number';
        $this->kind ??= 'number';

        return $this;
    }

    /**
     * Increment granularity of the inline number editor (its step attribute).
     * Accepts a positive number, a numeric string ('0.01' — shipped as a
     * number, must be > 0), or 'any' for arbitrary precision. Requires
     * numberInput() to also be called — without it, editInput is set but no
     * editable column is emitted, so step() silently has no effect; that
     * combination throws at serialization.
     */
    public function step(int|float|string $step): static
    {
        if ($step === 'any') {
            $this->editInput['step'] = $step;

            return $this;
        }
        if (is_string($step)) {
            if (! is_numeric($step)) {
                throw new InvalidArgumentException('Column::step() only accepts a positive number, a positive numeric string, or "any".');
            }
            $step = (float) $step;
        }
        if ($step <= 0) {
            throw new InvalidArgumentException('Column::step() only accepts a positive number, a positive numeric string, or "any".');
        }
        $this->editInput['step'] = $step;

        return $this;
    }

    /**
     * Display node rendered before the cell value — in display mode for any
     * kind (boolean ignores it) and inside the inline editor for text /
     * number / select columns. A string becomes a TextBlock; a nested Field
     * throws.
     */
    public function prefix(string|JsonSerializable $content): static
    {
        return $this->setAffix('prefix', $content);
    }

    /** Display node rendered after the cell value (e.g. a currency code). Same rules as prefix(). */
    public function suffix(string|JsonSerializable $content): static
    {
        return $this->setAffix('suffix', $content);
    }

    private function setAffix(string $key, string|JsonSerializable $content): static
    {
        $node = AffixNode::normalize("Column \"{$this->name}\"", $key, $content);
        if ($node === null) {
            unset($this->affixes[$key]);
        } else {
            $this->affixes[$key] = $node;
        }

        return $this;
    }

    /**
     * Static options for an editable select column. Uses the same {value, label}
     * normalization the Select field emits so the wire shape matches.
     *
     * @param  list<array{value: mixed, label: string}>  $options
     */
    public function options(array $options): static
    {
        $this->editOptions = OptionList::normalize($options);

        return $this;
    }

    /**
     * Laravel validation rules applied before the save closure runs.
     * Accepts pipe-delimited string or an array; deduplicates entries.
     *
     * @param  string|list<string>  $rules
     */
    public function rules(string|array $rules): static
    {
        $this->editRules = $this->appendRules($this->editRules, $rules);

        return $this;
    }

    /** Consumer-provided save closure — REQUIRED when column is editable. */
    public function onSave(Closure $fn): static
    {
        $this->onSaveClosure = $fn;

        return $this;
    }

    // -------------------------------------------------------------------------
    // Editable-column server-only accessors (never serialized)
    // -------------------------------------------------------------------------

    public function isEditable(): bool
    {
        return $this->editAs !== null;
    }

    /** @return list<string> */
    public function editRuleEntries(): array
    {
        return $this->editRules;
    }

    public function labelText(): ?string
    {
        return $this->label;
    }

    public function onSaveClosure(): ?Closure
    {
        return $this->onSaveClosure;
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

    public function isIndividuallySearchable(): bool
    {
        return $this->individuallySearchable === true;
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
        if ($this->individuallySearchable !== null) {
            $out['columnSearchable'] = $this->individuallySearchable;
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
        if ($this->noWrap === true) {
            $out['noWrap'] = true;
        }
        if ($this->tooltip !== null) {
            $out['tooltip'] = $this->tooltip;
        }
        if ($this->description !== null) {
            $out['description'] = $this->description;
        }
        if ($this->emphasized === true) {
            $out['emphasized'] = true;
        }
        if ($this->muted === true) {
            $out['muted'] = true;
        }
        if ($this->uppercase === true) {
            $out['uppercase'] = true;
        }
        if ($this->translatable === true) {
            $out['translatable'] = true;
        }
        foreach ($this->copyableOption() as $key => $value) {
            $out[$key] = $value;
        }

        // Kind-specific metadata: format, decimals, currency, badge, boolean, iconMap
        foreach ($this->kindMeta as $key => $value) {
            $out[$key] = $value;
        }
        foreach ($this->affixes as $key => $node) {
            $out[$key] = $node;
        }

        if ($this->editInput !== [] && $this->editAs === null) {
            throw new InvalidArgumentException(
                "Column \"{$this->name}\": step() requires numberInput().",
            );
        }

        // Editable: only emitted when editAs is set; onSaveClosure never serialized
        if ($this->editAs !== null) {
            if ($this->formatUsing !== null) {
                throw new InvalidArgumentException(
                    "Column \"{$this->name}\": formatting an inline-editable cell is unsupported, use affixes (prefix/suffix) instead.",
                );
            }
            $editable = ['as' => $this->editAs];
            $constraints = ConstraintMap::toConstraints($this->editRules);
            if ($constraints !== []) {
                $editable['constraints'] = $constraints;
            }
            if ($this->editOptions !== []) {
                $editable['options'] = $this->editOptions;
            }
            if ($this->editInput !== []) {
                $editable['input'] = $this->editInput;
            }
            $out['editable'] = $editable;
        }

        return $out;
    }
}
