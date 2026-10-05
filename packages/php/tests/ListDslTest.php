<?php

use Tbtop\Admin\Dsl\ListBuilder;
use Tbtop\Admin\Dsl\S;

function encodeList(ListBuilder $list): array
{
    return json_decode(json_encode($list), true);
}

it('List: minimal chain emits kind=list with name and empty items', function (): void {
    $json = encodeList(ListBuilder::make('recent'));

    expect($json['kind'])->toBe('list')
        ->and($json['name'])->toBe('recent')
        ->and($json['options']['items'])->toBe([]);
});

it('List: items closure result serializes title, meta, color, and url', function (): void {
    $json = encodeList(ListBuilder::make('pages')->items(fn (): array => [
        ['title' => 'Home', 'meta' => '2 min ago', 'color' => 'success', 'url' => '/admin/pages/1'],
        ['title' => 'About'],
    ]));

    expect($json['options']['items'])->toBe([
        ['title' => 'Home', 'meta' => '2 min ago', 'color' => 'success', 'url' => '/admin/pages/1'],
        ['title' => 'About'],
    ]);
});

it('List: items closure is lazy — not invoked before serialization', function (): void {
    $called = false;
    $list = ListBuilder::make('lazy')->items(function () use (&$called): array {
        $called = true;

        return [];
    });

    expect($called)->toBeFalse();
    $list->toNode();
    expect($called)->toBeTrue();
});

it('List: omitted optional item keys are absent from wire', function (): void {
    $json = encodeList(ListBuilder::make('bare')->items(fn (): array => [['title' => 'Only title']]));

    expect($json['options']['items'][0])->toBe(['title' => 'Only title']);
});

it('List: invalid item color throws', function (): void {
    ListBuilder::make('bad')
        ->items(fn (): array => [['title' => 'X', 'color' => 'purple']])
        ->toNode();
})->throws(InvalidArgumentException::class);

it('List: item without title throws', function (): void {
    ListBuilder::make('bad')
        ->items(fn (): array => [['meta' => 'no title']])
        ->toNode();
})->throws(InvalidArgumentException::class);

it('S::list() delegates to ListBuilder::make()', function (): void {
    $s = new S;
    $json = encodeList($s->list('recent')->items(fn (): array => [['title' => 'A', 'color' => 'muted']]));

    expect($json['kind'])->toBe('list')
        ->and($json['options']['items'][0]['color'])->toBe('muted');
});

it('List: array and listItem() forms produce the same item, newTab only with a url', function (): void {
    $s = new S;
    $json = encodeList(ListBuilder::make('links')->items(fn (): array => [
        ['title' => 'Post 1', 'meta' => '2h', 'color' => 'success', 'url' => '/admin/posts/1', 'openUrlInNewTab' => true],
        $s->listItem('Post 1')->meta('2h')->color('success')->url('/admin/posts/1')->openUrlInNewTab(),
        ['title' => 'No url', 'openUrlInNewTab' => true],
        $s->listItem('No url')->openUrlInNewTab(),
    ]));

    $linked = ['title' => 'Post 1', 'meta' => '2h', 'color' => 'success', 'url' => '/admin/posts/1', 'newTab' => true];
    expect($json['options']['items'])->toBe([$linked, $linked, ['title' => 'No url'], ['title' => 'No url']]);
});

it('List: a non-bool openUrlInNewTab throws naming the key', function (): void {
    encodeList(ListBuilder::make('bad')->items(fn (): array => [
        ['title' => 'X', 'url' => '/x', 'openUrlInNewTab' => 'yes'],
    ]));
})->throws(InvalidArgumentException::class, 'openUrlInNewTab');

it('List: an item that is neither an array nor a ListItem throws naming the type', function (): void {
    encodeList(ListBuilder::make('bad')->items(fn (): array => ['Just a string']));
})->throws(InvalidArgumentException::class, 'got string');
