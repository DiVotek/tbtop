<?php

use Tbtop\Admin\Dsl\S;

function encodeGroup(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('ActionGroup: defaults to buttons mode when as() not called', function (): void {
    $s = new S;
    $node = $s->actionGroup('More', []);

    $json = encodeGroup($node);

    expect($json['options'])->not->toHaveKey('as');
});

it('ActionGroup: as(buttons) serializes options.as = buttons', function (): void {
    $s = new S;
    $node = $s->actionGroup('More', [], 'buttons');

    $json = encodeGroup($node);

    expect($json['options']['as'])->toBe('buttons');
});

it('ActionGroup: as(dropdown) serializes options.as = dropdown', function (): void {
    $s = new S;
    $node = $s->actionGroup('More', [], 'dropdown');

    $json = encodeGroup($node);

    expect($json['options']['as'])->toBe('dropdown');
});
