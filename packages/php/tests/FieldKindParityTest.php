<?php

use Tbtop\Admin\Dsl\S;

/**
 * Scenario 1 — Parity: KindClass::make('x') produces the same node as $s->kind('x').
 * Loops over every entry in the kind→class map on S.
 *
 * Scope note: this asserts PHP factory ↔ PHP magic dispatch, NOT PHP ↔ client.
 * The client mapping is documented in docs/ai/fields.md and gated via
 * KitchenSinkPage + ContractTest (kinds are an open string, no closed enum).
 */
it('FieldKindParity: every built-in kind class make() matches s->kind() output', function (string $kind) {
    $s = new S;

    $viaS = json_encode($s->$kind('x'));
    $viaClass = json_encode(S::makeField($kind, 'x'));

    expect($viaClass)->toBe($viaS);
})->with(S::BUILT_IN_KINDS);

/**
 * Scenario 2 — Completeness: the public BUILT_IN_KINDS list and the bootstrapped
 * kind→class map are the same set. Guards against either PHP list drifting from
 * the other (e.g. a kind added to one spot but not the registered map).
 */
it('FieldKindParity: BUILT_IN_KINDS exactly equals the bootstrapped kindMap keys', function () {
    $declared = S::BUILT_IN_KINDS;
    $registered = array_keys(S::builtInKindClasses());

    sort($declared);
    sort($registered);

    expect($registered)->toBe($declared);
});
