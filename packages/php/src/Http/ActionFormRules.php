<?php

namespace Tbtop\Admin\Http;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\StructureWalk;

/**
 * Finds the form an action submits into.
 *
 * An action does not own its form. The form is a node the action sits inside,
 * and the action that receives `payload.form` is usually a *different* one from
 * the action the form hangs off: EditAction declares the form as the modal body
 * and submits from an inner save action nested in it. The client already
 * resolves this by walking the tree — materialize.ts sets formName when it
 * enters a form node and every action below inherits it. This mirrors that rule
 * server-side.
 *
 * No enclosing form means no rules, which is not an error: an action may read
 * `payload.form` and validate it by hand inside its handler.
 *
 * Descent goes through StructureWalk::actionSearchDescendants() — the widened
 * key set (table action lists, an action's modal body, prefix/suffix) that
 * this search alone needs, plus the ability to walk a not-yet-serialized
 * builder. Threading $enclosing (the closest form name seen above the
 * current node) through the walk is this class's own job: it is what the
 * search is for, not a traversal concern.
 */
final class ActionFormRules
{
    /**
     * Name of the form whose rules apply to $actionName, or null when none do.
     *
     * Null covers two cases that behave the same: the action has no form
     * ancestor, and the action never asked for form data. A Cancel button sits
     * in the same actions row as Save but declares no `needs: ['form']`, so
     * holding it to the form's rules would block closing the modal.
     */
    public static function enclosingFormName(Node $tree, string $actionName, iterable $additionalRoots = []): ?string
    {
        return self::search($tree, $actionName, null)
            ?? self::searchList($additionalRoots, $actionName, null);
    }

    private static function readsForm(Node $node): bool
    {
        $spec = $node->options['spec'] ?? null;

        return is_array($spec) && in_array('form', $spec['needs'] ?? [], true);
    }

    /**
     * Depth-first, carrying the closest form name seen above the current
     * node. $node may be a builder StructureWalk has not yet serialized.
     */
    private static function search(mixed $node, string $actionName, ?string $enclosing): ?string
    {
        $node = StructureWalk::resolveActionNode($node);
        if ($node === null) {
            return null;
        }
        if ($node->kind === 'action' && $node->name === $actionName) {
            return self::readsForm($node) ? $enclosing : null;
        }
        if ($node->kind === 'form' && $node->name !== null) {
            $enclosing = $node->name;
        }

        return self::searchList(StructureWalk::actionSearchDescendants($node), $actionName, $enclosing);
    }

    /** @param  iterable<mixed>  $children */
    private static function searchList(iterable $children, string $actionName, ?string $enclosing): ?string
    {
        foreach ($children as $child) {
            $found = self::search($child, $actionName, $enclosing);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }
}
