<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Concerns\HasDependencies;
use Tbtop\Admin\Dsl\DependencyFilter;
use Tbtop\Admin\Dsl\Node;

/** Date-range field: value shape {from?: string, to?: string}. Wire kind "daterange". */
final class Daterange extends Field
{
    use HasDependencies;

    /** Server-only closure computing disabled day ranges — never serialized. */
    private ?Closure $disabledRangesClosure = null;

    /** @var array<string, string> */
    private array $initialDeps = [];

    protected function kind(): string
    {
        return 'daterange';
    }

    /**
     * Deps-driven disabled day ranges.
     *
     * $fn: fn(array $deps): array — a list of ['from' => ?string, 'to' => ?string]
     * entries, ISO days (Y-m-d), both ends inclusive-disabled. A null 'from'
     * disables every day up to and including 'to' (min-date semantics); a null
     * 'to' disables 'from' and everything after (max-date). At least one end
     * must be non-null.
     *
     * The closure runs at page assembly (deps seeded from the form record) and
     * again per daterange-ranges request when a dependsOn() parent changes, so
     * it must be a pure function of $deps + captured scope. Without dependsOn()
     * the serialized ranges are final and the endpoint is never called.
     */
    public function disabledRanges(Closure $fn): static
    {
        $this->disabledRangesClosure = $fn;

        return $this;
    }

    /** Returns the ranges closure for server-side use (never sent to the wire). */
    public function disabledRangesClosure(): ?Closure
    {
        return $this->disabledRangesClosure;
    }

    /**
     * FormBuilder seeds this during serialization so the initial ranges use
     * the form record's values — an edit form opens already up to date.
     *
     * @param  array<string, mixed>  $record
     */
    public function seedInitialDeps(array $record): void
    {
        $this->initialDeps = DependencyFilter::filter($this->dependsOnFields(), $record);
    }

    /**
     * @param  array<string, mixed>  $deps
     * @return list<array{from: ?string, to: ?string}>
     */
    public function rangesWith(array $deps): array
    {
        $closure = $this->disabledRangesClosure;
        if ($closure === null) {
            throw new InvalidArgumentException(
                "daterange \"{$this->name}\" has no disabledRanges() closure.",
            );
        }

        $result = $closure(DependencyFilter::filter($this->dependsOnFields(), $deps));
        if (! is_array($result)) {
            throw new InvalidArgumentException(
                "daterange \"{$this->name}\": disabledRanges() must return a list of ranges.",
            );
        }

        return array_map($this->normalizeRange(...), array_values($result));
    }

    public function toNode(): Node
    {
        if ($this->disabledRangesClosure !== null) {
            $this->opts['disabledRanges'] = $this->rangesWith($this->initialDeps);
        }

        return parent::toNode();
    }

    /** @return array{from: ?string, to: ?string} */
    private function normalizeRange(mixed $range): array
    {
        if (! is_array($range)) {
            throw new InvalidArgumentException(
                "daterange \"{$this->name}\": each disabled range must be an array with 'from'/'to'.",
            );
        }
        $from = $range['from'] ?? null;
        $to = $range['to'] ?? null;
        if (($from !== null && ! is_string($from)) || ($to !== null && ! is_string($to))) {
            throw new InvalidArgumentException(
                "daterange \"{$this->name}\": disabled range ends must be Y-m-d strings or null.",
            );
        }
        if ($from === null && $to === null) {
            throw new InvalidArgumentException(
                "daterange \"{$this->name}\": a disabled range needs at least one non-null end.",
            );
        }

        return ['from' => $from, 'to' => $to];
    }
}
