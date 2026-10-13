<?php

namespace Tbtop\Admin\Commands\Resource;

/**
 * One table column as make:tbtop-resource sees it: the database facts plus
 * what the model adds (enum cast, translatable). Kind is a coarse bucket the
 * field mapper switches on, not a database type name.
 *
 * @internal
 */
final class ColumnInfo
{
    /**
     * @param  'string'|'text'|'integer'|'decimal'|'boolean'|'date'|'datetime'|'time'|'json'|'other'  $kind
     * @param  class-string|null  $enum  BackedEnum the model casts the column to
     * @param  array{table: string, column: string, model: class-string|null, labelKey: string, relation: string|null}|null  $foreign
     */
    public function __construct(
        public readonly string $name,
        public readonly string $kind,
        public readonly ?int $length,
        public readonly bool $nullable,
        public readonly ?string $default,
        public readonly bool $unique,
        public readonly bool $translatable,
        public readonly ?string $enum,
        public readonly ?array $foreign,
    ) {}

    /** NOT NULL: the form must send a value (a boolean always does). */
    public function isRequired(): bool
    {
        return ! $this->nullable && $this->kind !== 'boolean';
    }

    /** PHP literal for the column's default, or 'null' when it has none or it is an expression. */
    public function defaultLiteral(): string
    {
        $raw = $this->default === null ? null : trim((string) preg_replace('/::[\w\s]+$/', '', $this->default));
        if ($raw === null || $raw === '' || strtolower($raw) === 'null') {
            return $this->kind === 'boolean' && ! $this->nullable ? 'false' : 'null';
        }
        $value = preg_match("/^'(.*)'$/s", $raw, $m) === 1 ? str_replace("''", "'", $m[1]) : $raw;

        return match (true) {
            $this->kind === 'boolean' => in_array(strtolower($value), ['1', 'true', "b'1'"], true) ? 'true' : 'false',
            in_array($this->kind, ['integer', 'decimal'], true) && is_numeric($value) => $value,
            in_array($this->kind, ['string', 'text'], true) && $raw !== $value => var_export($value, true),
            default => 'null',
        };
    }
}
