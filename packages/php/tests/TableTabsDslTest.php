<?php

use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;

it('serializes tabs as name/label/count with label falling back to name', function () {
    $node = (new TableBuilder('posts'))
        ->columns(['title' => 'Title'])
        ->tabs([
            Tab::make('all'),
            Tab::make('published')->label('Published')->query(fn ($q) => $q)->count(),
        ])
        ->toNode();

    expect($node->options['tabs'])->toBe([
        ['name' => 'all', 'label' => 'all', 'count' => false],
        ['name' => 'published', 'label' => 'Published', 'count' => true],
    ]);
});

it('omits tabs from the wire when none are declared', function () {
    $node = (new TableBuilder('posts'))->columns(['title' => 'Title'])->toNode();

    expect($node->options)->not->toHaveKey('tabs');
});

it('throws on duplicate tab names at build time', function () {
    (new TableBuilder('posts'))->tabs([
        Tab::make('all'),
        Tab::make('all')->label('Again'),
    ]);
})->throws(InvalidArgumentException::class, 'Duplicate tab name "all" on table "posts".');
