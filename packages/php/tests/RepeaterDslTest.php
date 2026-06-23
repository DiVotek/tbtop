<?php

use Tbtop\Admin\Dsl\Fields\Repeater;

it('serializes minItems and defaultItems into the repeater options', function (): void {
    $node = json_decode(json_encode(
        Repeater::make('rows')->minItems(1)->defaultItems(3)
    ), true);

    expect($node['options']['minItems'])->toBe(1)
        ->and($node['options']['defaultItems'])->toBe(3);
});
