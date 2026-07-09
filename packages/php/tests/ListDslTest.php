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
