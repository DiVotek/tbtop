<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;

/**
 * One summary under a table column, passed to Column::summarize(). The
 * built-ins (sum/avg/min/max/count) aggregate the column over every row the
 * table's current query matches — tab, search and filters applied, not just
 * the page — and format like the column's cells (money, number, date), so a
 * total reads the way the rows do. using() hands the same filtered query to
 * a closure and shows whatever it returns, text included, unformatted.
 */
final class Summary implements JsonSerializable
{
    public const BUILT_IN = ['sum', 'avg', 'min', 'max', 'count'];

    private function __construct(
        public readonly string $type,
        private readonly ?string $label,
        private readonly ?Closure $using = null,
    ) {}

    /** Sum of the column. Default label: "Sum". */
    public static function sum(?string $label = null): self
    {
        return new self('sum', $label);
    }

    /** Average of the column. Default label: "Average". */
    public static function avg(?string $label = null): self
    {
        return new self('avg', $label);
    }

    /** Smallest value of the column. Default label: "Min". */
    public static function min(?string $label = null): self
    {
        return new self('min', $label);
    }

    /** Largest value of the column. Default label: "Max". */
    public static function max(?string $label = null): self
    {
        return new self('max', $label);
    }

    /** Number of matching rows, shown as a plain integer. Default label: "Count". */
    public static function count(?string $label = null): self
    {
        return new self('count', $label);
    }

    /**
     * A custom summary: $fn receives a clone of the table's filtered query
     * (Eloquent or query builder, sort removed) and returns the value to
     * show, a number or text. In a row group the query is also narrowed to
     * that group.
     *
     * @param  Closure(mixed): mixed  $fn
     */
    public static function using(Closure $fn, string $label): self
    {
        return new self('custom', $label, $fn);
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function usingClosure(): ?Closure
    {
        return $this->using;
    }

    /** @return array{type: string, label?: string} */
    public function jsonSerialize(): array
    {
        $out = ['type' => $this->type];
        if ($this->label !== null) {
            $out['label'] = $this->label;
        }

        return $out;
    }
}
