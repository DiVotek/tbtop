<?php

namespace Tbtop\Admin\Http;

use LogicException;
use Tbtop\Admin\Dsl\Node;

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
 */
final class ActionFormRules
{
    /** Options that can carry a nested subtree beyond the plain child lists. */
    private const NESTED_OPTION_KEYS = ['body', 'spec', 'prefix', 'suffix'];

    /**
     * Name of the form whose rules apply to $actionName, or null when none do.
     *
     * Null covers two cases that behave the same: the action has no form
     * ancestor, and the action never asked for form data. A Cancel button sits
     * in the same actions row as Save but declares no `needs: ['form']`, so
     * holding it to the form's rules would block closing the modal.
     */
    public static function enclosingFormName(Node $tree, string $actionName): ?string
    {
        return self::search($tree, $actionName, null);
    }

    private static function readsForm(Node $node): bool
    {
        $spec = $node->options['spec'] ?? null;

        return is_array($spec) && in_array('form', $spec['needs'] ?? [], true);
    }

    /** Depth-first, carrying the closest form name seen above the current node. */
    private static function search(mixed $node, string $actionName, ?string $enclosing): ?string
    {
        if (is_object($node) && ! $node instanceof Node && method_exists($node, 'toNode')) {
            // Builders sit in the tree unserialized — a form's children hold
            // ActionBuilder instances, not their nodes.
            //
            // toNode() rejects some authoring mistakes by throwing (slideOver()
            // on a non-modal action, say). That belongs to the render path; here
            // it would turn one bad sibling into a 500 for an unrelated action,
            // so an unserializable branch is simply not searchable.
            try {
                $serialized = $node->toNode();
            } catch (LogicException) {
                return null;
            }

            return self::search($serialized, $actionName, $enclosing);
        }
        if (! $node instanceof Node) {
            return null;
        }
        if ($node->kind === 'action' && $node->name === $actionName) {
            return self::readsForm($node) ? $enclosing : null;
        }
        if ($node->kind === 'form' && $node->name !== null) {
            $enclosing = $node->name;
        }

        return self::searchBelow($node, $actionName, $enclosing);
    }

    private static function searchBelow(Node $node, string $actionName, ?string $enclosing): ?string
    {
        foreach (Node::CHILD_LIST_KEYS as $key) {
            $found = self::searchList($node->options[$key] ?? [], $actionName, $enclosing);
            if ($found !== null) {
                return $found;
            }
        }
        foreach (self::NESTED_OPTION_KEYS as $key) {
            $found = self::searchOption($node->options[$key] ?? null, $actionName, $enclosing);
            if ($found !== null) {
                return $found;
            }
        }
        foreach ($node->options['tabs'] ?? [] as $tab) {
            $found = self::searchOption(is_array($tab) ? ($tab['body'] ?? null) : null, $actionName, $enclosing);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /** A nested option is either a subtree itself or an array carrying one under 'body'. */
    private static function searchOption(mixed $option, string $actionName, ?string $enclosing): ?string
    {
        if (is_array($option)) {
            return self::searchOption($option['body'] ?? null, $actionName, $enclosing);
        }

        return $option === null ? null : self::search($option, $actionName, $enclosing);
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
