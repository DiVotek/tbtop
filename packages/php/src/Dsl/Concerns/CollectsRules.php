<?php

namespace Tbtop\Admin\Dsl\Concerns;

use InvalidArgumentException;

/**
 * Shared Laravel-rule collection for value primitives (Field, Column): parse a
 * pipe string or array, reject pipe-unsafe regex strings, dedupe, and merge.
 *
 * Adopters keep their own storage + public accessor (ruleEntries on Field,
 * editRuleEntries on Column) and route their rules() through appendRules().
 */
trait CollectsRules
{
    /**
     * Merge new rules onto an existing list. A regex: pattern passed as a string
     * would be split on its own '|', so it must come in as an array element.
     *
     * @param  list<string>  $existing
     * @param  string|list<string>  $rules
     * @return list<string>
     */
    protected function appendRules(array $existing, string|array $rules): array
    {
        if (is_string($rules) && str_contains($rules, 'regex:')) {
            throw new InvalidArgumentException(
                "\"{$this->name}\": pass regex rules as an array - '|' inside the pattern would be split.",
            );
        }
        $list = is_string($rules) ? explode('|', $rules) : $rules;

        return array_values(array_unique([...$existing, ...$list]));
    }
}
