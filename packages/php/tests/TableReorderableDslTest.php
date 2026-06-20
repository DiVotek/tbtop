<?php

use Tbtop\Admin\Dsl\TableBuilder;

function encodeReorderable(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('TableBuilder: reorderable serializes options.reorder and defaults the sort to the column', function (): void {
    $node = (new TableBuilder('t'))->reorderable('sort_order')->toNode();

    $json = encodeReorderable($node);

    expect($json['options']['reorder'])->toBe(['column' => 'sort_order']);
    expect($json['options']['defaultSort'])->toBe(['field' => 'sort_order', 'dir' => 'asc']);
});

it('TableBuilder: reorderable accepts a custom column name', function (): void {
    $node = (new TableBuilder('t'))->reorderable('position')->toNode();

    $json = encodeReorderable($node);

    expect($json['options']['reorder'])->toBe(['column' => 'position']);
    expect($json['options']['defaultSort'])->toBe(['field' => 'position', 'dir' => 'asc']);
});

it('TableBuilder: explicit defaultSort wins over the reorder column default', function (): void {
    $node = (new TableBuilder('t'))
        ->defaultSort('created_at', 'desc')
        ->reorderable('sort_order')
        ->toNode();

    $json = encodeReorderable($node);

    expect($json['options']['reorder'])->toBe(['column' => 'sort_order']);
    expect($json['options']['defaultSort'])->toBe(['field' => 'created_at', 'dir' => 'desc']);
});

it('TableBuilder: reorderColumn accessor returns the column, or null when not set', function (): void {
    expect((new TableBuilder('t'))->reorderable('sort_order')->reorderColumn())->toBe('sort_order');
    expect((new TableBuilder('t'))->reorderColumn())->toBeNull();
});

it('TableBuilder: without reorderable no reorder key in options', function (): void {
    $json = encodeReorderable((new TableBuilder('t'))->toNode());

    expect($json['options'])->not->toHaveKey('reorder');
});
