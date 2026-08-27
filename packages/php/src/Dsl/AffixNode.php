<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Normalizes a prefix()/suffix() argument into a display node — shared by
 * form fields (HasAffixes) and table columns so both emit the same wire shape.
 */
final class AffixNode
{
    /**
     * A plain string becomes a TextBlock; any other JsonSerializable node is
     * used as-is. Null when the child is excluded (S::normalizeChild). $owner
     * names the caller in the error message, e.g. 'Field "price"'.
     */
    public static function normalize(string $owner, string $key, string|JsonSerializable $content): ?JsonSerializable
    {
        $node = S::normalizeChild(is_string($content) ? TextBlock::make($content) : $content);
        if ($node === null) {
            return null;
        }
        self::assertDisplayOnly($owner, $key, [$node]);

        return $node;
    }

    /**
     * An affix decorates the control; it is not a second input. A field nested
     * there renders but stays invisible to RuleWalker, which descends into
     * Node children only — its rules would silently never be collected.
     *
     * @param  list<mixed>  $nodes
     */
    private static function assertDisplayOnly(string $owner, string $key, array $nodes): void
    {
        foreach ($nodes as $node) {
            if ($node instanceof Field) {
                throw new InvalidArgumentException(
                    "{$owner} {$key}() received field \"{$node->name}\" — affixes may contain display nodes only.",
                );
            }
            if ($node instanceof Node) {
                self::assertDisplayOnly($owner, $key, $node->nestedChildren());
            }
        }
    }
}
