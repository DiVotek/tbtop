<?php

use Tbtop\Admin\Dsl\S;

it('table poll emits options.poll in seconds', function (): void {
    $s = new S;
    $json = json_decode(json_encode($s->table('orders')->columns(['id' => 'ID'])->poll(15)), true);

    expect($json['options']['poll'])->toBe(15);
});

it('table without poll emits no poll key (back-compat)', function (): void {
    $s = new S;
    $json = json_decode(json_encode($s->table('orders')->columns(['id' => 'ID'])), true);

    expect($json['options'])->not->toHaveKey('poll');
});

it('table poll below the 5s minimum throws', function (): void {
    (new S)->table('orders')->poll(4);
})->throws(InvalidArgumentException::class, 'Table poll interval must be at least 5 seconds.');
