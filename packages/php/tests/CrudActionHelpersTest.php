<?php

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Actions\EditAction;
use Tbtop\Admin\Dsl\Actions\ReplicateAction;
use Tbtop\Admin\Dsl\S;

/** @return array<string, mixed> */
function actionJson(ActionBuilder $action): array
{
    return json_decode(json_encode($action), true);
}

// ---------------------------------------------------------------------------
// EditAction — modal + query + inner save server action
// ---------------------------------------------------------------------------

it('EditAction emits a modal with query + queryNeeds[row] and an inner save action', function (): void {
    $s = new S;
    $edit = EditAction::make(
        $s,
        form: $s->form('editPost', [$s->text('title')->label('Title')]),
        loadUsing: fn (ActionCtx $ctx): array => ['title' => 'x'],
        saveUsing: fn (ActionCtx $ctx): Effects => Effects::make(),
    );

    $spec = actionJson($edit)['options']['spec'];

    expect($spec['type'])->toBe('modal')
        ->and($spec['query'])->toBe(true)
        ->and($spec['queryNeeds'])->toBe(['row']);

    $save = $spec['body']['options']['children'][1]['options']['children'][0];
    expect($save['name'])->toBe('editSave')
        ->and($save['options']['spec']['type'])->toBe('server')
        ->and($save['options']['spec']['needs'])->toBe(['row', 'form']);
});

it('EditAction returns a chainable ActionBuilder and registers itself + inner actions', function (): void {
    $s = new S;
    $edit = EditAction::make(
        $s,
        form: $s->form('editPost', [$s->text('title')]),
        loadUsing: fn (ActionCtx $ctx): array => [],
        saveUsing: fn (ActionCtx $ctx): Effects => Effects::make(),
        name: 'edit',
    )->color('primary');

    expect($edit)->toBeInstanceOf(ActionBuilder::class)
        ->and($s->collectedActions())->toHaveKeys(['edit', 'editSave', 'editCancel']);
});

// ---------------------------------------------------------------------------
// DeleteAction — danger server action, confirm, single row + bulk
// ---------------------------------------------------------------------------

it('DeleteAction emits a danger server action with confirm and needs[row]', function (): void {
    $s = new S;
    $delete = DeleteAction::make($s, using: fn (ActionCtx $ctx) => null);

    $opts = actionJson($delete)['options'];

    expect($opts['spec']['type'])->toBe('server')
        ->and($opts['spec']['needs'])->toBe(['row'])
        ->and($opts['color'])->toBe('danger')
        ->and($opts['confirm']['title'])->toBe('Delete record?');
});

it('DeleteAction with bulk:true switches to needs[selection]', function (): void {
    $s = new S;
    $delete = DeleteAction::make($s, using: fn (ActionCtx $ctx) => null, name: 'delete-selected', bulk: true);

    $spec = actionJson($delete)['options']['spec'];

    expect($spec['type'])->toBe('server')
        ->and($spec['needs'])->toBe(['selection'])
        ->and($s->collectedActions())->toHaveKey('delete-selected');
});

it('DeleteAction returns a chainable ActionBuilder and registers itself', function (): void {
    $s = new S;
    $delete = DeleteAction::make($s, using: fn (ActionCtx $ctx) => null)->label('Remove');

    expect($delete)->toBeInstanceOf(ActionBuilder::class)
        ->and($s->collectedActions())->toHaveKey('delete');
});

// ---------------------------------------------------------------------------
// ReplicateAction — server action, needs[row], label
// ---------------------------------------------------------------------------

it('ReplicateAction emits a server action with needs[row] and label Replicate', function (): void {
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null);

    $opts = actionJson($replicate)['options'];

    expect($opts['spec']['type'])->toBe('server')
        ->and($opts['spec']['needs'])->toBe(['row'])
        ->and($opts['label'])->toBe('Replicate');
});

it('ReplicateAction returns a chainable ActionBuilder and registers itself', function (): void {
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null, name: 'clone')->color('secondary');

    expect($replicate)->toBeInstanceOf(ActionBuilder::class)
        ->and($s->collectedActions())->toHaveKey('clone');
});
