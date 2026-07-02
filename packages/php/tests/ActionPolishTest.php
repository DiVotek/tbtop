<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Actions\CreateAction;
use Tbtop\Admin\Dsl\Actions\ViewAction;
use Tbtop\Admin\Dsl\DisplayValueBlock;
use Tbtop\Admin\Dsl\S;

/** @return array<string, mixed> */
function polishActionJson(ActionBuilder $action): array
{
    return json_decode(json_encode($action), true);
}

// ---------------------------------------------------------------------------
// authorize() — omission across collection points
// ---------------------------------------------------------------------------

it('authorize: a failing ability drops the action from actionsRow serialization', function (): void {
    Gate::define('never', fn (?object $user) => false);
    $s = new S;
    $row = $s->actionsRow([
        $s->action('visible')->visit('/x'),
        $s->action('hidden')->visit('/y')->authorize('never'),
    ]);

    $json = json_decode(json_encode($row), true);
    $names = array_column($json['options']['children'], 'name');

    expect($names)->toBe(['visible']);
});

it('authorize: a failing ability drops the action from table rowActions serialization', function (): void {
    Gate::define('never-row', fn (?object $user) => false);
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->query(fn () => null)
        ->rowActions([
            $s->action('visible')->visit('/x'),
            $s->action('hidden')->visit('/y')->authorize('never-row'),
        ]);

    $json = json_decode(json_encode($table), true);
    $names = array_column($json['options']['rowActions'], 'name');

    expect($names)->toBe(['visible']);
});

// ---------------------------------------------------------------------------
// slideOver
// ---------------------------------------------------------------------------

it('slideOver: serializes slideOver:true into the modal spec', function (): void {
    $s = new S;
    $action = $s->action('open')->modal('Title')->slideOver();

    expect(polishActionJson($action)['options']['spec']['slideOver'])->toBeTrue();
});

it('slideOver: throws when used on a non-modal action', function (): void {
    $s = new S;
    $action = $s->action('go')->visit('/x')->slideOver();

    expect(fn () => $action->toNode())->toThrow(LogicException::class);
});

// ---------------------------------------------------------------------------
// Extended modal sizes
// ---------------------------------------------------------------------------

it('modalWidth: accepts every extended size through toNode', function (): void {
    $sizes = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'];
    foreach ($sizes as $size) {
        $s = new S;
        $action = $s->action('open')->modal('Title')->modalWidth($size);

        expect(polishActionJson($action)['options']['spec']['size'])->toBe($size);
    }
});

it('modalWidth: rejects an unknown size', function (): void {
    $s = new S;

    expect(fn () => $s->action('open')->modal('Title')->modalWidth('huge'))
        ->toThrow(InvalidArgumentException::class);
});

// ---------------------------------------------------------------------------
// haltModal effect — contract
// ---------------------------------------------------------------------------

it('haltModal: contract test validates against the effects schema', function (): void {
    $effects = Effects::make()->haltModal('Something went wrong');

    validateAgainstSchema(json_decode(json_encode($effects)), '#/$defs/effects');

    $json = json_decode(json_encode($effects), true);
    expect($json[0])->toBe(['kind' => 'haltModal', 'message' => 'Something went wrong', 'level' => 'error']);
});

it('haltModal: accepts a custom kind', function (): void {
    $json = json_decode(json_encode(Effects::make()->haltModal('Careful', 'warning')), true);

    expect($json[0]['level'])->toBe('warning');
});

// ---------------------------------------------------------------------------
// DisplayValueBlock::field() — mutual exclusion with baked kinds
// ---------------------------------------------------------------------------

it('DisplayValueBlock: field() after a baked kind throws', function (): void {
    $block = DisplayValueBlock::make('2024-01-01')->date();

    expect(fn () => $block->field('published_at'))->toThrow(LogicException::class);
});

it('DisplayValueBlock: a baked kind after field() throws', function (): void {
    $block = DisplayValueBlock::make(null)->field('published_at');

    expect(fn () => $block->date())->toThrow(LogicException::class);
});

it('DisplayValueBlock: field() serializes the field name without a value', function (): void {
    $json = json_decode(json_encode(DisplayValueBlock::make(null)->field('title')), true);

    expect($json['options']['field'])->toBe('title')
        ->and($json['options'])->not->toHaveKey('kind');
});

// ---------------------------------------------------------------------------
// CreateAction
// ---------------------------------------------------------------------------

it('CreateAction: emits a modal with the form record defaulted and an inner store action', function (): void {
    $s = new S;
    $create = CreateAction::make(
        $s,
        form: $s->form('createPost', [$s->text('title')->label('Title')]),
        storeUsing: fn (ActionCtx $ctx): Effects => Effects::make(),
        defaultRecord: ['title' => ''],
    );

    $spec = polishActionJson($create)['options']['spec'];
    expect($spec['type'])->toBe('modal')
        ->and($spec)->not->toHaveKey('query');

    $store = $spec['body']['options']['children'][1]['options']['children'][0];
    expect($store['name'])->toBe('createStore')
        ->and($store['options']['spec']['needs'])->toBe(['form']);

    expect($s->collectedForms()['createPost']->recordData())->toBe(['title' => '']);
});

it('CreateAction: void storeUsing falls back to notify+closeModal+refreshTable', function (): void {
    $s = new S;
    CreateAction::make(
        $s,
        form: $s->form('createPost', [$s->text('title')]),
        storeUsing: fn (ActionCtx $ctx) => null,
    );

    $store = $s->collectedActions()['createStore'];
    $effects = ($store->handler())(new ActionCtx(request: new Request, user: null));

    $json = json_decode(json_encode($effects), true);
    expect(array_column($json, 'kind'))->toBe(['notify', 'closeModal', 'refreshTable']);
});

it('CreateAction: returns a chainable ActionBuilder and registers itself + inner actions', function (): void {
    $s = new S;
    $create = CreateAction::make(
        $s,
        form: $s->form('createPost', [$s->text('title')]),
        storeUsing: fn (ActionCtx $ctx): Effects => Effects::make(),
        name: 'create',
    )->color('primary');

    expect($create)->toBeInstanceOf(ActionBuilder::class)
        ->and($s->collectedActions())->toHaveKeys(['create', 'createStore', 'createCancel']);
});

// ---------------------------------------------------------------------------
// ViewAction
// ---------------------------------------------------------------------------

it('ViewAction: emits a modal with query + queryNeeds[row] and a close-only actionsRow', function (): void {
    $s = new S;
    $view = ViewAction::make(
        $s,
        loadUsing: fn (ActionCtx $ctx): array => ['title' => 'x'],
        render: fn () => $s->displayValue(null)->field('title'),
    );

    $spec = polishActionJson($view)['options']['spec'];
    expect($spec['type'])->toBe('modal')
        ->and($spec['query'])->toBe(true)
        ->and($spec['queryNeeds'])->toBe(['row']);

    $closeRow = $spec['body']['options']['children'][1];
    $close = $closeRow['options']['children'][0];
    expect($close['name'])->toBe('viewClose')
        ->and($close['options']['label'])->toBe('Close');
});

it('ViewAction: render() runs once at author time, not per row', function (): void {
    $s = new S;
    $calls = 0;
    ViewAction::make(
        $s,
        loadUsing: fn (ActionCtx $ctx): array => [],
        render: function () use ($s, &$calls) {
            $calls++;

            return $s->displayValue('static')->field('title');
        },
    );

    expect($calls)->toBe(1);
});

it('ViewAction: returns a chainable ActionBuilder and registers itself + close action', function (): void {
    $s = new S;
    $view = ViewAction::make(
        $s,
        loadUsing: fn (ActionCtx $ctx): array => [],
        render: fn () => $s->displayValue('x'),
        name: 'view',
    )->color('primary');

    expect($view)->toBeInstanceOf(ActionBuilder::class)
        ->and($s->collectedActions())->toHaveKeys(['view', 'viewClose']);
});
