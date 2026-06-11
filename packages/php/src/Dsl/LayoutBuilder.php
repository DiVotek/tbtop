<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;
use JsonSerializable;

/**
 * Fluent builder for row and stack layout nodes.
 *
 * $s->row([...])->justify('between')->align('center')->gap(4)->wrap()
 *
 * Returned by S::row() and S::stack() so callers can chain flex options
 * before the node is serialised.  Implements JsonSerializable so it can sit
 * anywhere a Node is accepted in an array (children, fixture, etc.).
 */
final class LayoutBuilder implements JsonSerializable
{
    // -------------------------------------------------------------------------
    // Valid enum values — static maps prevent template-built class names in
    // the client and make the allowed set explicit in one place.
    // -------------------------------------------------------------------------

    private const JUSTIFY_VALUES = ['start', 'center', 'end', 'between', 'around', 'evenly'];

    private const ALIGN_VALUES = ['start', 'center', 'end', 'stretch', 'baseline'];

    private const GAP_MIN = 0;

    private const GAP_MAX = 12;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    private ?string $justify = null;

    private ?string $align = null;

    private ?int $gap = null;

    private bool $wrap = false;

    /** @param  list<mixed>  $children @param  array<string, mixed>  $options @param  array<string, mixed>  $meta */
    public function __construct(
        private readonly string $kind,
        private readonly array $children,
        private readonly array $options = [],
        private readonly array $meta = [],
    ) {}

    // -------------------------------------------------------------------------
    // Fluent setters
    // -------------------------------------------------------------------------

    /**
     * Main-axis alignment (justify-content).
     *
     * @param  'start'|'center'|'end'|'between'|'around'|'evenly'  $value
     */
    public function justify(string $value): self
    {
        if (! in_array($value, self::JUSTIFY_VALUES, true)) {
            throw new InvalidArgumentException(
                "Invalid justify value \"{$value}\". Allowed: ".implode(', ', self::JUSTIFY_VALUES).'.',
            );
        }

        $clone = clone $this;
        $clone->justify = $value;

        return $clone;
    }

    /**
     * Cross-axis alignment (align-items).
     *
     * @param  'start'|'center'|'end'|'stretch'|'baseline'  $value
     */
    public function align(string $value): self
    {
        if (! in_array($value, self::ALIGN_VALUES, true)) {
            throw new InvalidArgumentException(
                "Invalid align value \"{$value}\". Allowed: ".implode(', ', self::ALIGN_VALUES).'.',
            );
        }

        $clone = clone $this;
        $clone->align = $value;

        return $clone;
    }

    /**
     * Gap scale step (0–12, maps to Tailwind gap-{n}).
     */
    public function gap(int $value): self
    {
        if ($value < self::GAP_MIN || $value > self::GAP_MAX) {
            throw new InvalidArgumentException(
                "Invalid gap value {$value}. Must be between ".self::GAP_MIN.' and '.self::GAP_MAX.'.',
            );
        }

        $clone = clone $this;
        $clone->gap = $value;

        return $clone;
    }

    /**
     * Enable flex-wrap.
     */
    public function wrap(): self
    {
        $clone = clone $this;
        $clone->wrap = true;

        return $clone;
    }

    // -------------------------------------------------------------------------
    // Translatable cascade (mirrors Node::translatable)
    // -------------------------------------------------------------------------

    /**
     * Cascade translatable onto every descendant Field and return a Node.
     */
    public function translatable(): Node
    {
        return $this->toNode()->translatable();
    }

    // -------------------------------------------------------------------------
    // Build
    // -------------------------------------------------------------------------

    /**
     * Materialise as a Node, merging the flex options that were set.
     */
    public function toNode(): Node
    {
        $opts = $this->options;

        if ($this->justify !== null) {
            $opts['justify'] = $this->justify;
        }
        if ($this->align !== null) {
            $opts['align'] = $this->align;
        }
        if ($this->gap !== null) {
            $opts['gap'] = $this->gap;
        }
        if ($this->wrap) {
            $opts['wrap'] = true;
        }

        return new Node($this->kind, [...$opts, 'children' => $this->children], null, $this->meta);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
