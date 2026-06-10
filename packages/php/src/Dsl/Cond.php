<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;
use JsonSerializable;

/**
 * Serializable condition AST node.
 * Static constructors mirror the wire-grammar ops; all instances are
 * immutable value objects that JSON-serialize to the locked wire shape.
 */
final class Cond implements JsonSerializable
{
    /** @param array<string, mixed> $data */
    private function __construct(private readonly array $data) {}

    // --- Field-comparison ops ---

    public static function eq(string $field, mixed $value): self
    {
        return new self(['op' => 'eq', 'field' => $field, 'value' => $value]);
    }

    public static function neq(string $field, mixed $value): self
    {
        return new self(['op' => 'neq', 'field' => $field, 'value' => $value]);
    }

    /** @param list<mixed> $value */
    public static function in(string $field, array $value): self
    {
        return new self(['op' => 'in', 'field' => $field, 'value' => $value]);
    }

    /** @param list<mixed> $value */
    public static function notIn(string $field, array $value): self
    {
        return new self(['op' => 'notIn', 'field' => $field, 'value' => $value]);
    }

    public static function empty(string $field): self
    {
        return new self(['op' => 'empty', 'field' => $field]);
    }

    public static function notEmpty(string $field): self
    {
        return new self(['op' => 'notEmpty', 'field' => $field]);
    }

    public static function truthy(string $field): self
    {
        return new self(['op' => 'truthy', 'field' => $field]);
    }

    public static function gt(string $field, mixed $value): self
    {
        return new self(['op' => 'gt', 'field' => $field, 'value' => $value]);
    }

    public static function gte(string $field, mixed $value): self
    {
        return new self(['op' => 'gte', 'field' => $field, 'value' => $value]);
    }

    public static function lt(string $field, mixed $value): self
    {
        return new self(['op' => 'lt', 'field' => $field, 'value' => $value]);
    }

    public static function lte(string $field, mixed $value): self
    {
        return new self(['op' => 'lte', 'field' => $field, 'value' => $value]);
    }

    // --- Combinators ---

    public static function all(self ...$conds): self
    {
        return new self(['op' => 'all', 'conds' => array_values($conds)]);
    }

    public static function any(self ...$conds): self
    {
        return new self(['op' => 'any', 'conds' => array_values($conds)]);
    }

    public static function not(self $cond): self
    {
        return new self(['op' => 'not', 'cond' => $cond]);
    }

    // --- Reserved ---

    public static function server(): self
    {
        return new self(['op' => 'server']);
    }

    // --- Shorthand factory ---

    /**
     * Maps operator symbols to named Cond constructors.
     * Operator map:
     *   =  → eq,  != → neq,  > → gt,  >= → gte,  < → lt,  <= → lte
     *   in → in,  not in → notIn
     *   empty (no value)  → empty
     *   not empty         → notEmpty
     *   truthy            → truthy
     */
    public static function fromShorthand(string $field, string $op, mixed $value = null): self
    {
        return match ($op) {
            '=' => self::eq($field, $value),
            '!=' => self::neq($field, $value),
            '>' => self::gt($field, $value),
            '>=' => self::gte($field, $value),
            '<' => self::lt($field, $value),
            '<=' => self::lte($field, $value),
            'in' => self::in($field, (array) $value),
            'not in' => self::notIn($field, (array) $value),
            'empty' => self::empty($field),
            'not empty' => self::notEmpty($field),
            'truthy' => self::truthy($field),
            default => throw new InvalidArgumentException("Unknown condition operator \"{$op}\"."),
        };
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->data;
    }
}
