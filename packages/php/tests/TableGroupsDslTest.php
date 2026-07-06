<?php

use Tbtop\Admin\Dsl\TableBuilder;

function encodeGroups(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('TableBuilder: groups() matching defaultSort serializes options.groups', function (): void {
    $node = (new TableBuilder('t'))
        ->defaultSort('views', 'desc')
        ->groups('views')
        ->toNode();

    $json = encodeGroups($node);

    expect($json['options']['groups'])->toBe(['column' => 'views']);
});

it('TableBuilder: groups() without a matching defaultSort throws', function (): void {
    (new TableBuilder('t'))->groups('views');
})->throws(InvalidArgumentException::class);

it('TableBuilder: groups() against a defaultSort on a different column throws', function (): void {
    (new TableBuilder('t'))
        ->defaultSort('created_at', 'desc')
        ->groups('views');
})->throws(InvalidArgumentException::class);
