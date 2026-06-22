<?php

use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Tab;

function encodeActionForIconTest(ActionBuilder $action): array
{
    return json_decode(json_encode($action), true);
}

// ---------------------------------------------------------------------------
// ActionBuilder
// ---------------------------------------------------------------------------

it('Action: icon serializes as structured shape', function (): void {
    $json = encodeActionForIconTest(
        (new ActionBuilder('save'))->label('Save')->icon('save')->visit('/save')
    );

    expect($json['options']['icon'])->toBe(['name' => 'save', 'position' => 'left']);
});

it('Action: icon with right position', function (): void {
    $json = encodeActionForIconTest(
        (new ActionBuilder('next'))->label('Next')->icon('arrow-right', 'right')->visit('/next')
    );

    expect($json['options']['icon'])->toBe(['name' => 'arrow-right', 'position' => 'right']);
});

it('Action: tooltip serializes in options', function (): void {
    $json = encodeActionForIconTest(
        (new ActionBuilder('save'))->label('Save')->tooltip('Save your changes')->visit('/save')
    );

    expect($json['options']['tooltip'])->toBe('Save your changes');
});

it('Action: icon and tooltip together', function (): void {
    $json = encodeActionForIconTest(
        (new ActionBuilder('delete'))->icon('trash')->tooltip('Delete record')->visit('/del')
    );

    expect($json['options']['icon'])->toBe(['name' => 'trash', 'position' => 'left'])
        ->and($json['options']['tooltip'])->toBe('Delete record');
});

it('Action: without icon/tooltip omits both keys', function (): void {
    $json = encodeActionForIconTest(
        (new ActionBuilder('save'))->label('Save')->visit('/save')
    );

    expect($json['options'])->not->toHaveKey('icon')
        ->and($json['options'])->not->toHaveKey('tooltip');
});

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

it('Tab: icon serializes in toWire', function (): void {
    $wire = Tab::make('published')->label('Published')->icon('check')->toWire();

    expect($wire['icon'])->toBe(['name' => 'check', 'position' => 'left']);
});

it('Tab: tooltip serializes in toWire', function (): void {
    $wire = Tab::make('draft')->label('Drafts')->tooltip('Unpublished posts')->toWire();

    expect($wire['tooltip'])->toBe('Unpublished posts');
});

it('Tab: icon and tooltip together', function (): void {
    $wire = Tab::make('active')
        ->label('Active')
        ->icon('circle', 'right')
        ->tooltip('Currently active users')
        ->toWire();

    expect($wire['icon'])->toBe(['name' => 'circle', 'position' => 'right'])
        ->and($wire['tooltip'])->toBe('Currently active users');
});

it('Tab: without icon/tooltip omits both keys', function (): void {
    $wire = Tab::make('all')->label('All')->toWire();

    expect($wire)->not->toHaveKey('icon')
        ->and($wire)->not->toHaveKey('tooltip');
});
