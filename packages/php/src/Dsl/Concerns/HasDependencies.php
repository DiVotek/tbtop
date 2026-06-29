<?php

namespace Tbtop\Admin\Dsl\Concerns;

use InvalidArgumentException;

/**
 * Declarative cross-field dependencies for async fields. The dependent field's
 * query() closure receives parent values; the client refetches and cascades.
 */
trait HasDependencies
{
    private const PARENT_EMPTY_MODES = ['disabled', 'empty'];

    /**
     * Declare the parent field(s) whose value this field's options depend on.
     * Their current values reach the query() closure as ['field' => value].
     *
     * @param  string|list<string>  $fields
     */
    public function dependsOn(string|array $fields): static
    {
        $list = is_string($fields) ? [$fields] : $fields;

        return $this->set('dependsOn', $list);
    }

    /** Keep the selected value when a parent changes (default: reset to empty). */
    public function keepValueOnParentChange(bool $keep = true): static
    {
        if ($keep) {
            return $this->set('keepValue', true);
        }
        unset($this->opts['keepValue']);

        return $this;
    }

    /**
     * Behavior while a declared parent has no value:
     *  'disabled' (default) — field is disabled, no request fired.
     *  'empty'              — field stays enabled but shows an empty list.
     */
    public function whenParentEmpty(string $mode): static
    {
        if (! in_array($mode, self::PARENT_EMPTY_MODES, true)) {
            throw new InvalidArgumentException(
                "whenParentEmpty() expects 'disabled' or 'empty', got \"{$mode}\".",
            );
        }
        if ($mode === 'empty') {
            return $this->set('whenParentEmpty', 'empty');
        }
        unset($this->opts['whenParentEmpty']);

        return $this;
    }

    /** @return list<string> */
    public function dependsOnFields(): array
    {
        $list = $this->opts['dependsOn'] ?? [];

        return is_array($list) ? array_values($list) : [];
    }
}
