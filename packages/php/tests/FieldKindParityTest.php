<?php

use Tbtop\Admin\Dsl\S;

/**
 * Scenario 1 — Parity: KindClass::make('x') produces the same node as $s->kind('x').
 * Loops over every entry in the kind→class map on S.
 */
it('FieldKindParity: every built-in kind class make() matches s->kind() output', function (string $kind) {
    $s = new S;

    $viaS = json_encode($s->$kind('x'));
    $viaClass = json_encode(S::makeField($kind, 'x'));

    expect($viaClass)->toBe($viaS);
})->with(S::BUILT_IN_KINDS);
