<?php

namespace Tbtop\Admin\Dsl;

/**
 * The single rule deciding which children reach the wire, kept apart from both
 * callers so Node does not have to depend on S. Today the only rule is the Gate
 * check behind ->authorize().
 *
 * Node applies it to its own 'children'/'fields' options, which covers every
 * node however it was built. S applies it to the child lists it has names for
 * but Node does not — table 'columns'/'filters'/'rowActions' and the like — and
 * to single values such as a tab body.
 */
final class ChildInclusion
{
    /**
     * @param  list<mixed>  $children
     * @return list<mixed>
     */
    public static function filter(array $children): array
    {
        return array_values(array_filter($children, self::includes(...)));
    }

    public static function includes(mixed $child): bool
    {
        return ! ($child instanceof ActionBuilder) || $child->isAuthorized();
    }
}
