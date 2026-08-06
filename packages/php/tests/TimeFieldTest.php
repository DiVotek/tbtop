<?php

use Tbtop\Admin\Dsl\S;

it('serializes minute precision and its step', function () {
    $json = json_decode(json_encode((new S)->time('opens_at')->minuteStep(15)), true);

    expect($json)->toMatchArray([
        'kind' => 'time',
        'name' => 'opens_at',
        'options' => [
            'minuteStep' => 15,
        ],
    ]);
});

it('serializes seconds precision and its step', function () {
    $json = json_decode(json_encode((new S)->time('opens_at')->seconds()->secondStep(5)), true);

    expect($json)->toMatchArray([
        'kind' => 'time',
        'name' => 'opens_at',
        'options' => [
            'seconds' => true,
            'secondStep' => 5,
        ],
    ]);
});

it('rejects a minute step outside one hour', function (int $step) {
    expect(fn () => (new S)->time('opens_at')->minuteStep($step))
        ->toThrow(InvalidArgumentException::class);
})->with([0, 61]);

it('rejects a second step outside a displayed minute', function (int $step) {
    expect(fn () => (new S)->time('opens_at')->seconds()->secondStep($step))
        ->toThrow(InvalidArgumentException::class);
})->with([0, 60]);

it('rejects incompatible precision options', function () {
    expect(fn () => (new S)->time('opens_at')->minuteStep(15)->seconds())
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => (new S)->time('opens_at')->seconds()->minuteStep(15))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => (new S)->time('opens_at')->secondStep(5))
        ->toThrow(InvalidArgumentException::class);
});
