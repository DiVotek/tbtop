<?php

namespace Tbtop\Admin\Dsl;

/**
 * The single rule deciding which children reach the wire, kept apart from both
 * callers so Node does not have to depend on S. Two rules compose here: the
 * Gate check behind ->authorize(), and the conditional existence behind
 * ->when(). Either one failing excludes the child.
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
        if ($child instanceof ActionBuilder && ! $child->isAuthorized()) {
            return false;
        }

        return self::isConditionMet($child);
    }

    /**
     * True unless the child carries a ->when() that resolved false. Keyed off
     * the isIncluded() method rather than a list of classes: the HasWhen trait
     * supplies it for the mutable builders, Node implements it by hand because
     * it is immutable, and a consumer's own builder opts in the same way.
     */
    public static function isConditionMet(mixed $child): bool
    {
        return ! is_object($child)
            || ! method_exists($child, 'isIncluded')
            || $child->isIncluded();
    }
}
