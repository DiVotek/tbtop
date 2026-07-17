<?php

namespace Tbtop\Admin\Panels;

use LogicException;
use stdClass;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Resolves a panel's chrome class (package default when unset) and
 * serializes its three areas into the `tbtop.chrome` shared prop.
 */
final class ChromeSerializer
{
    /** @return array{header: stdClass|null, sidebar: stdClass|null, footer: stdClass|null} */
    public static function forPanel(CurrentPanel $panel): array
    {
        $chrome = self::resolve($panel);
        $s = new S;

        return [
            'header' => self::serializeArea($chrome->header($s), 'header', $chrome::class),
            'sidebar' => self::serializeArea($chrome->sidebar($s), 'sidebar', $chrome::class),
            'footer' => self::serializeArea($chrome->footer($s), 'footer', $chrome::class),
        ];
    }

    private static function resolve(CurrentPanel $panel): Chrome
    {
        $class = $panel->chrome();
        if ($class === null) {
            return new Chrome;
        }
        if (! is_a($class, Chrome::class, true)) {
            throw new LogicException(
                "Panel \"{$panel->id()}\" chrome class {$class} must extend ".Chrome::class.'.',
            );
        }

        return new $class;
    }

    private static function serializeArea(?Node $node, string $area, string $chromeClass): ?stdClass
    {
        if ($node === null) {
            return null;
        }
        $node = self::filterAuthorizedChildren($node);
        /** @var stdClass $tree decoding without assoc keeps empty option bags as JSON objects */
        $tree = json_decode((string) json_encode($node));
        self::assertNoServerActions($tree, $area, $chromeClass);

        return $tree;
    }

    /**
     * Drop chrome items the current user isn't authorized for, mirroring how
     * page-level lists (headerActions, actionsRow, actionGroup) already run
     * ActionBuilder::filterAuthorized() before reaching the wire. Chrome
     * trees are built with $s->row()/$s->stack(), which — unlike those
     * page-level builders — do not filter their top-level children, so this
     * is the one spot standing between an ->authorize()'d chrome action and
     * an unauthorized user still seeing it in the header/sidebar/footer.
     * Nested action groups filter their own children when built; only the
     * top-level items list needs handling here.
     */
    private static function filterAuthorizedChildren(Node $node): Node
    {
        $children = $node->options['children'] ?? null;
        if (! is_array($children)) {
            return $node;
        }

        return new Node(
            $node->kind,
            [...$node->options, 'children' => ActionBuilder::filterAuthorized($children)],
            $node->name,
            $node->meta,
        );
    }

    /**
     * Chrome trees are page-independent — a server-closure action has no
     * endpoint to resolve against, so reject it at serialization time.
     */
    private static function assertNoServerActions(mixed $value, string $area, string $chromeClass): void
    {
        if (is_array($value)) {
            foreach ($value as $item) {
                self::assertNoServerActions($item, $area, $chromeClass);
            }

            return;
        }
        if (! $value instanceof stdClass) {
            return;
        }
        if (($value->kind ?? null) === 'action' && ($value->options->spec->type ?? null) === 'server') {
            $name = is_string($value->name ?? null) ? $value->name : 'unnamed';
            throw new LogicException(
                "Chrome trees are page-independent: server action \"{$name}\" in {$chromeClass}::{$area}() "
                .'cannot resolve outside a page. Use ->visit() or ->custom() instead of ->handle().',
            );
        }
        foreach (get_object_vars($value) as $prop) {
            self::assertNoServerActions($prop, $area, $chromeClass);
        }
    }
}
