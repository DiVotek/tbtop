<?php

use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\S;

it('FormActions::save emits a primary submit with the mod+s keybinding', function (): void {
    $s = new S;

    $opts = json_decode(json_encode(FormActions::save($s)), true)['options'];

    expect($opts['label'])->toBe('Save')
        ->and($opts['color'])->toBe('primary')
        ->and($opts['keybinding'])->toBe('mod+s')
        ->and($opts['spec']['type'])->toBe('submit')
        ->and($s->collectedActions())->toHaveKey('save');
});

it('FormActions::save keeps the label overridable via argument', function (): void {
    $s = new S;

    $opts = json_decode(json_encode(FormActions::save($s, 'Create')), true)['options'];

    expect($opts['label'])->toBe('Create');
});

it('FormActions::saveCancel rows Save, extras, then a Cancel visit', function (): void {
    $s = new S;
    $extra = $s->action('delete')->label('Delete')->color('danger')->visit('/admin/x');

    $row = json_decode(json_encode(FormActions::saveCancel($s, '/admin/posts', extra: [$extra])), true);
    $children = $row['options']['children'];

    expect($children[0]['name'])->toBe('save')
        ->and($children[1]['name'])->toBe('delete')
        ->and($children[2]['name'])->toBe('cancel')
        ->and($children[2]['options']['spec'])->toBe(['type' => 'visit', 'href' => '/admin/posts']);
});
