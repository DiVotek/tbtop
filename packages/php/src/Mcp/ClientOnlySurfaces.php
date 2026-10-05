<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\StructureWalk;
use Tbtop\Admin\Http\ResolvedPage;

/** Browser-only parts of a page; listed as excluded so a page is not silently empty to an agent. */
final class ClientOnlySurfaces
{
    /** @return list<array{id: string, reason: string}> */
    public static function of(ResolvedPage $resolved): array
    {
        $slug = $resolved->page::slug();
        $out = [];
        $isLibrary = static fn (mixed $node): bool => $node instanceof Node && $node->kind === 'mediaLibrary';
        if (StructureWalk::collect($resolved->tree, $isLibrary) !== []) {
            $out[] = ['id' => "{$slug}:mediaLibrary", 'reason' => 'client-only media library: it runs in the browser'];
        }
        foreach (array_keys($resolved->s->collectedTables()) as $name) {
            if ($resolved->s->reachableTable($name)?->reorderColumn() !== null) {
                $out[] = ['id' => "{$slug}:{$name}.reorder", 'reason' => 'drag-reorder runs in the browser'];
            }
        }

        return $out;
    }

    public static function has(ResolvedPage $resolved, string $id): bool
    {
        return in_array($id, array_column(self::of($resolved), 'id'), true);
    }
}
