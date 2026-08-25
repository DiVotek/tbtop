<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Fields\Field;

/**
 * The structure tree's one traversal: which option keys hold children, and
 * whether a child is included. Both used to be re-derived per reader —
 * Node::nestedChildren(), Field::childFields(), RuleWalker, RecordDefaults,
 * TranslatableRecord and FormBuilder's searches each carried their own key
 * list, and ActionFormRules needed a wider one (table action lists, an
 * action's modal body) that the others never learned. Two axes drifted
 * independently: which keys count as children (69d9b2e — an action nested in
 * a table's row actions inside a form lost its enclosing form because only
 * one walker descended rowActions), and whether ChildInclusion is consulted
 * at all (three walkers never called it and were correct only by the
 * coincidence of pre-filtered inputs).
 *
 * Mirrors the client's structureChildren() (commit 614aaa9), which unified
 * the same drift on the read side.
 */
final class StructureWalk
{
    /** Option keys holding a list of table actions — descended only by the action-form search. */
    private const ACTION_LIST_KEYS = ['headerActions', 'rowActions', 'bulkActions'];

    /** Option keys that can carry a nested subtree beyond the plain child lists — action-form search only. */
    private const ACTION_NESTED_KEYS = ['body', 'spec'];

    /**
     * One level of included children: a Field's sub-fields, or a Node's
     * children/fields/prefix/suffix/tab bodies. Anything else (a display
     * block, a scalar) has none.
     *
     * @return list<mixed>
     */
    public static function descendants(mixed $node): array
    {
        if ($node instanceof Field) {
            return $node->childFields();
        }
        if ($node instanceof Node) {
            return self::fromOptions($node->options, false);
        }

        return [];
    }

    /**
     * Resolves a tree entry to the Node the action-form search reasons about:
     * a builder is not yet serialized (a form's children hold ActionBuilder
     * instances, not their nodes) and must go through toNode() first; a plain
     * array or scalar has none. toNode() rejects some authoring mistakes by
     * throwing (slideOver() on a non-modal action, say) — that belongs to the
     * render path, so an unserializable branch resolves to null and is simply
     * not searchable, rather than turning one bad sibling into a 500 for an
     * unrelated action.
     */
    public static function resolveActionNode(mixed $node): ?Node
    {
        if ($node instanceof Node) {
            return $node;
        }
        if (! is_object($node) || ! method_exists($node, 'toNode')) {
            return null;
        }
        try {
            return $node->toNode();
        } catch (\LogicException) {
            return null;
        }
    }

    /**
     * descendants(), widened for the action-form search: also follows table
     * action lists (headerActions/rowActions/bulkActions) and an action's
     * modal body (spec.body). Takes an already-resolved Node — see
     * resolveActionNode().
     *
     * @return list<mixed>
     */
    public static function actionSearchDescendants(Node $node): array
    {
        return self::fromOptions($node->options, true);
    }

    /**
     * Depth-first search for the first descendant (starting with $root itself)
     * that $matches accepts. Excluded subtrees are skipped whole — every
     * caller of this resolves a field or block by name for an endpoint, so a
     * when(false) branch must be unreachable here or that endpoint stays live
     * for content that never reached the wire.
     *
     * @param  callable(mixed): bool  $matches
     */
    public static function find(mixed $root, callable $matches): mixed
    {
        if (! ChildInclusion::isConditionMet($root)) {
            return null;
        }
        if ($matches($root)) {
            return $root;
        }
        foreach (self::descendants($root) as $child) {
            $found = self::find($child, $matches);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Depth-first collect of every descendant (starting with $root itself)
     * that $matches accepts. Same exclusion rule as find(): an excluded
     * subtree contributes nothing.
     *
     * @param  callable(mixed): bool  $matches
     * @return list<mixed>
     */
    public static function collect(mixed $root, callable $matches): array
    {
        if (! ChildInclusion::isConditionMet($root)) {
            return [];
        }
        $out = $matches($root) ? [$root] : [];
        foreach (self::descendants($root) as $child) {
            $out = [...$out, ...self::collect($child, $matches)];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $options
     * @return list<mixed>
     */
    private static function fromOptions(array $options, bool $withActionKeys): array
    {
        $out = [];
        foreach (Node::CHILD_LIST_KEYS as $key) {
            $out = [...$out, ...self::includedList($options[$key] ?? null)];
        }
        if ($withActionKeys) {
            foreach (self::ACTION_LIST_KEYS as $key) {
                $out = [...$out, ...self::includedList($options[$key] ?? null)];
            }
        }
        foreach (Node::CHILD_KEYS as $key) {
            if (($options[$key] ?? null) !== null) {
                $out[] = $options[$key];
            }
        }
        if ($withActionKeys) {
            foreach (self::ACTION_NESTED_KEYS as $key) {
                $nested = self::actionNestedChild($options[$key] ?? null);
                if ($nested !== null) {
                    $out[] = $nested;
                }
            }
        }
        foreach ($options['tabs'] ?? [] as $tab) {
            if (is_array($tab) && isset($tab['body'])) {
                $out[] = $tab['body'];
            }
        }

        return $out;
    }

    /**
     * Node's constructor already runs children/fields through
     * ChildInclusion::filter() at construction, so this is a defensive
     * second pass, not the only one — it is what makes the traversal safe
     * to point at option arrays a caller built by hand (ActionFormRules
     * walks builders before they are ever wrapped in a Node).
     *
     * @return list<mixed>
     */
    private static function includedList(mixed $value): array
    {
        return is_array($value) ? ChildInclusion::filter(array_values($value)) : [];
    }

    /**
     * 'body' is a subtree directly; 'spec' is an action's spec array, which
     * carries its own 'body' for the modal variant (visit/submit/handle/custom
     * specs have none).
     */
    private static function actionNestedChild(mixed $option): mixed
    {
        if (is_array($option)) {
            return $option['body'] ?? null;
        }

        return $option;
    }
}
