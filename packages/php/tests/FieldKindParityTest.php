<?php

use Tbtop\Admin\Dsl\Fields\Field;
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
 * Scenario 2 — Completeness: every kind in the public BUILT_IN_KINDS list is
 * present in the bootstrapped kind→class map (and resolves to a Field class).
 * Guards against a built-in drifting out of the registered map (or vice-versa).
 *
 * Asserts a SUBSET, not set-equality: the live kindMap may also carry
 * consumer kinds added via S::register() (e.g. the demo's `rating`, or
 * FieldRegistryTest), which are intentionally NOT in BUILT_IN_KINDS. Requiring
 * exact equality would make this test order-dependent on whichever suite
 * registered a custom kind first.
 */
it('FieldKindParity: every BUILT_IN_KINDS entry is registered in the kindMap', function () {
    $registered = S::builtInKindClasses();

    foreach (S::BUILT_IN_KINDS as $kind) {
        expect($registered)->toHaveKey($kind);
        expect(is_subclass_of($registered[$kind], Field::class))->toBeTrue();
    }
});
