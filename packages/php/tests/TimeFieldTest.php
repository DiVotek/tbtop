<?php

use Tbtop\Admin\Dsl\S;

it('serializes the time minute step', function () {
    $json = json_decode(json_encode((new S)->time('opens_at')->step(15)), true);

    expect($json)->toMatchArray([
        'kind' => 'time',
        'name' => 'opens_at',
        'options' => [
            'step' => 15,
        ],
    ]);
});

it('rejects a time step outside one hour', function (int $step) {
    expect(fn () => (new S)->time('opens_at')->step($step))
        ->toThrow(InvalidArgumentException::class);
})->with([0, 61]);
