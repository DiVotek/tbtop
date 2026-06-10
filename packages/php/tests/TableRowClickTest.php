<?php

use Tbtop\Admin\Dsl\S;

function encodeRowClick(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('TableBuilder: rowClick serializes options.rowClick', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->rowClick('edit')
        ->query(fn () => null);

    $json = encodeRowClick($table->toNode());

    expect($json['options']['rowClick'])->toBe('edit');
});

it('TableBuilder: without rowClick no rowClick key in options', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->query(fn () => null);

    $json = encodeRowClick($table->toNode());

    expect($json['options'])->not->toHaveKey('rowClick');
});
