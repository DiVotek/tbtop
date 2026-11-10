<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Builder;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page for TableReorderHttpTest.
 * Uses the 'ecposts' table (created by the test beforeEach with a sort_order column).
 */
class ReorderPostsPage extends Page
{
    /** @var list<array{ids: list<int|string>, scoped: int}> Calls to the closures. */
    public static array $calls = [];

    public static function path(): string
    {
        return 'reorder-posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            // Reorderable over the full table.
            $s->table('ecposts')
                ->columns(['title' => 'Title'])
                ->reorderable('sort_order')
                ->query(fn () => EcPost::query())
                ->toNode(),
            // Scoped reorderable: only published rows are reachable — used to
            // test the "id outside scope → rejected" security case.
            $s->table('ecposts_published')
                ->columns(['title' => 'Title'])
                ->reorderable('sort_order')
                ->query(fn () => EcPost::query()->where('published', true))
                ->toNode(),
            // Custom persistence: the closure replaces the package write and
            // returns its own effects.
            $s->table('ecposts_custom')
                ->columns(['title' => 'Title'])
                ->reorderable('sort_order', function (array $ids, Builder $query): Effects {
                    self::$calls[] = ['ids' => $ids, 'scoped' => $query->count()];

                    return Effects::make()->notify('Order saved');
                })
                ->query(fn () => EcPost::query())
                ->toNode(),
            // Custom persistence over a scoped query: returns nothing, so the
            // default refreshTable applies; out-of-scope ids never reach it.
            $s->table('ecposts_custom_published')
                ->columns(['title' => 'Title'])
                ->reorderable('sort_order', function (array $ids, Builder $query): void {
                    self::$calls[] = ['ids' => $ids, 'scoped' => $query->count()];
                })
                ->query(fn () => EcPost::query()->where('published', true))
                ->toNode(),
            // Not reorderable: the endpoint must reject it (422), never trusting
            // a client that hits a non-reorderable table.
            $s->table('ecposts_plain')
                ->columns(['title' => 'Title'])
                ->query(fn () => EcPost::query())
                ->toNode(),
        ]);
    }
}
