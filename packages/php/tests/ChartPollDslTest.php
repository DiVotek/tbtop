<?php

use Tbtop\Admin\Dsl\S;

it('chart poll emits options.poll alongside the query source', function (): void {
    $s = new S;
    $json = json_decode(json_encode($s->chart('load', 'line')->query(fn () => [])->poll(10)), true);

    expect($json['options']['poll'])->toBe(10)
        ->and($json['options']['source'])->toBe('load');
});

it('chart without poll emits no poll key (back-compat)', function (): void {
    $s = new S;
    $json = json_decode(json_encode($s->chart('load', 'line')->query(fn () => [])), true);

    expect($json['options'])->not->toHaveKey('poll');
});

it('chart poll below the 5s minimum throws', function (): void {
    (new S)->chart('load', 'line')->poll(4);
})->throws(InvalidArgumentException::class);
