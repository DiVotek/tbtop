<?php

use Tbtop\Admin\Dsl\TableBuilder;

function encodeEmbedded(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('TableBuilder: embedded() serializes options.embedded=true', function (): void {
    $json = encodeEmbedded((new TableBuilder('t'))->embedded()->toNode());

    expect($json['options']['embedded'])->toBeTrue();
});

it('TableBuilder: embedded(false) serializes options.embedded=false', function (): void {
    $json = encodeEmbedded((new TableBuilder('t'))->embedded(false)->toNode());

    expect($json['options']['embedded'])->toBeFalse();
});

it('TableBuilder: without embedded() the key is absent — default behavior stays byte-identical', function (): void {
    $json = encodeEmbedded((new TableBuilder('t'))->toNode());

    expect($json['options'])->not->toHaveKey('embedded');
});

it('TableBuilder: embedded() does not affect perPage/pagination serialization', function (): void {
    $json = encodeEmbedded((new TableBuilder('t'))->embedded()->perPage(10)->toNode());

    expect($json['options']['pagination']['perPage'])->toBe(10)
        ->and($json['options']['embedded'])->toBeTrue();
});
