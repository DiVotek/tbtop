<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\RecordDefaults;
use Tbtop\Admin\Dsl\RuleWalker;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\StructureWalk;
use Tbtop\Admin\Http\ActionFormRules;

// ---------------------------------------------------------------------------
// One traversal, every key set: descendants() must reach a child however it
// arrived, whichever reader asks. Before this, six readers each carried their
// own copy of this key list and drifted independently (69d9b2e, 614aaa9's
// server-side counterpart). Table-driven over the key set this class states
// once, so a future reader that stops going through StructureWalk — or a key
// added here but missed elsewhere — shows up as a gap in this table, not a
// silent miss three call sites away.
// ---------------------------------------------------------------------------

it('reaches a child under every structural key StructureWalk knows about', function (string $label, callable $build) {
    $s = new S;
    $marker = $s->text('marker');
    $node = $build($s, $marker);

    $names = array_map(
        static fn (mixed $c) => $c instanceof Field ? $c->name : null,
        StructureWalk::descendants($node),
    );

    expect($names)->toContain('marker');
})->with([
    'children' => ['children', fn (S $s, $marker) => new Node('stack', ['children' => [$marker]])],
    'fields' => ['fields', fn (S $s, $marker) => new Node('repeater', ['fields' => [$marker]])],
    'prefix' => ['prefix', fn (S $s, $marker) => new Node('text', ['prefix' => $marker])],
    'suffix' => ['suffix', fn (S $s, $marker) => new Node('text', ['suffix' => $marker])],
    'tabs[].body' => ['tabs[].body', fn (S $s, $marker) => $s->tabs([['label' => 'One', 'body' => $marker]])],
]);

it('reaches an action under every action-search key ActionFormRules needs', function (string $label, callable $build) {
    $s = new S;
    $marker = $s->action('marker')->handle(fn () => null, needs: ['form']);
    $tree = $build($s, $marker);

    expect(ActionFormRules::enclosingFormName($tree, 'marker'))->toBe('outer');
})->with([
    'rowActions' => ['rowActions', fn (S $s, $marker) => $s->form('outer', [
        $s->table('t')->rowActions([$marker])->query(fn () => null)->toNode(),
    ])->toNode()],
    'headerActions' => ['headerActions', fn (S $s, $marker) => $s->form('outer', [
        $s->table('t')->headerActions([$marker])->query(fn () => null)->toNode(),
    ])->toNode()],
    'bulkActions' => ['bulkActions', fn (S $s, $marker) => $s->form('outer', [
        $s->table('t')->bulkActions([$marker])->query(fn () => null)->toNode(),
    ])->toNode()],
    'spec.body (modal)' => ['spec.body', fn (S $s, $marker) => $s->form('outer', [
        $s->action('opener')->modal('M', $marker),
    ])->toNode()],
]);

// ---------------------------------------------------------------------------
// The inclusion axis: whichever entry point reaches StructureWalk, a child
// excluded by when() or a failing authorize() must not come back — three
// readers (RuleWalker, RecordDefaults, TranslatableRecord) used to skip this
// check themselves and were correct only because every caller happened to
// pre-filter.
// ---------------------------------------------------------------------------

it('drops a when(false) child from descendants(), find() and collect()', function () {
    $s = new S;
    $node = new Node('stack', [
        'children' => [$s->text('kept'), $s->text('gone')->when(false)],
    ]);

    $names = array_map(fn ($c) => $c->name, StructureWalk::descendants($node));
    expect($names)->toBe(['kept']);

    $found = StructureWalk::find($node, fn ($c) => $c instanceof Field && $c->name === 'gone');
    expect($found)->toBeNull();

    $collected = StructureWalk::collect($node, fn ($c) => $c instanceof Field);
    expect(array_map(fn ($c) => $c->name, $collected))->toBe(['kept']);
});

it('drops an unauthorized action from an action-search descent', function () {
    Gate::define('structure-walk-never', fn (?object $user) => false);
    $s = new S;
    $tree = $s->form('outer', [
        $s->table('t')
            ->rowActions([$s->action('blocked')->handle(fn () => null, needs: ['form'])->authorize('structure-walk-never')])
            ->query(fn () => null)
            ->toNode(),
    ])->toNode();

    expect(ActionFormRules::enclosingFormName($tree, 'blocked'))->toBeNull();
});

// ---------------------------------------------------------------------------
// Cross-walker agreement on the same tree — the property the review named:
// every reader built on StructureWalk must reach the same top-level field set
// for a plain layout tree, and the two readers with a deliberate repeater
// deviation (RecordDefaults skips rows; TranslatableRecord never looked at
// Field::childFields() and still doesn't) must diverge from RuleWalker in
// exactly the documented way, not by accident.
// ---------------------------------------------------------------------------

it('agrees with RuleWalker on which top-level fields a plain layout exposes', function () {
    $s = new S;
    $children = [
        $s->section(['title' => 'S'], [
            $s->text('visible')->default('v'),
            $s->text('gone')->when(false)->default('g'),
        ]),
    ];

    $ruleKeys = array_keys(RuleWalker::collect($children));
    $seededKeys = array_keys(RecordDefaults::apply([], $children));

    expect($ruleKeys)->toBe(['visible'])
        ->and($seededKeys)->toBe(['visible']);
});

it('documents the repeater deviation: RuleWalker validates rows, RecordDefaults does not descend into them', function () {
    $s = new S;
    $children = [
        $s->repeater('rows')->defaultItems(1)->fields([$s->text('row_field')->required()->default('leak')]),
    ];

    expect(array_keys(RuleWalker::collect($children)))->toContain('rows.*.row_field');

    // RecordDefaults treats a repeater as its own data level: the repeater's
    // own row count seeds 'rows', but the review-flagged deviation stands —
    // a sub-field's default() never reaches the top-level record.
    $seeded = RecordDefaults::apply([], $children);
    expect($seeded)->toHaveKey('rows')
        ->and($seeded)->not->toHaveKey('row_field');
});
