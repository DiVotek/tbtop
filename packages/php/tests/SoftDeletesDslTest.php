<?php

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Tests\Fixtures\SdPost;

/** @return array<string, mixed> Serialized table-node options. */
function softDeletesTableOptions(callable $build): array
{
    $s = new S;
    $table = $s->table('sdposts')->query(fn () => SdPost::query());
    $build($s, $table);

    return json_decode(json_encode($table->softDeletes($s, SdPost::class)->toNode()), true)['options'];
}

it('prepends active/trashed/all tabs with active first', function (): void {
    $opts = softDeletesTableOptions(fn ($s, $table) => null);

    expect(array_column($opts['tabs'], 'name'))->toBe(['active', 'trashed', 'withTrashed'])
        ->and(array_column($opts['tabs'], 'label'))->toBe(['Active', 'Trashed', 'All']);
});

it('appends restore + forceDelete row actions with correct color/spec/confirm', function (): void {
    $actions = softDeletesTableOptions(fn ($s, $table) => null)['rowActions'];
    $byName = collect($actions)->keyBy('name');

    expect($byName)->toHaveKeys(['restore', 'forceDelete'])
        ->and($byName['restore']['options']['color'])->toBe('gray')
        ->and($byName['restore']['options']['spec'])->toBe(['type' => 'server', 'needs' => ['row']])
        ->and($byName['restore']['options'])->not->toHaveKey('confirm')
        ->and($byName['forceDelete']['options']['color'])->toBe('danger')
        ->and($byName['forceDelete']['options']['confirm'])->toBe([
            'title' => 'Delete permanently?',
            'description' => 'This cannot be undone.',
        ]);
});

it('appends restore + forceDelete bulk actions needing the selection', function (): void {
    $bulk = softDeletesTableOptions(fn ($s, $table) => null)['bulkActions'];
    $byName = collect($bulk)->keyBy('name');

    expect($byName)->toHaveKeys(['restoreSelected', 'forceDeleteSelected'])
        ->and($byName['restoreSelected']['options']['spec'])->toBe(['type' => 'server', 'needs' => ['selection']])
        ->and($byName['forceDeleteSelected']['options']['confirm']['title'])->toBe('Delete permanently?');
});

it('merges with tabs/rowActions the consumer already set, keeping both', function (): void {
    $opts = softDeletesTableOptions(function ($s, $table): void {
        $table->tabs([Tab::make('mine')->label('Mine')]);
        $table->rowActions([$s->action('edit')->label('Edit')->visit('/x')]);
        $table->bulkActions([$s->action('publish')->label('Publish')->handle(fn () => null, needs: ['selection'])]);
    });

    expect(array_column($opts['tabs'], 'name'))->toBe(['active', 'trashed', 'withTrashed', 'mine'])
        ->and(array_column($opts['rowActions'], 'name'))->toBe(['edit', 'restore', 'forceDelete'])
        ->and(array_column($opts['bulkActions'], 'name'))->toBe(['publish', 'restoreSelected', 'forceDeleteSelected']);
});

it('honors per-part opt-outs', function (): void {
    $s = new S;
    $table = $s->table('sdposts')->query(fn () => SdPost::query())
        ->softDeletes($s, SdPost::class, ['rowActions' => false, 'bulkActions' => false]);

    $opts = json_decode(json_encode($table->toNode()), true)['options'];

    expect(array_column($opts['tabs'], 'name'))->toBe(['active', 'trashed', 'withTrashed'])
        ->and($opts)->not->toHaveKey('rowActions')
        ->and($opts)->not->toHaveKey('bulkActions');
});

it('opts out of tabs while still adding actions', function (): void {
    $opts = softDeletesTableOptionsWithTabsOff();

    expect($opts)->not->toHaveKey('tabs')
        ->and(array_column($opts['rowActions'], 'name'))->toBe(['restore', 'forceDelete']);
});

/** @return array<string, mixed> */
function softDeletesTableOptionsWithTabsOff(): array
{
    $s = new S;
    $table = $s->table('sdposts')->query(fn () => SdPost::query())
        ->softDeletes($s, SdPost::class, ['tabs' => false]);

    return json_decode(json_encode($table->toNode()), true)['options'];
}
