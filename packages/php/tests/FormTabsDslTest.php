<?php

use Tbtop\Admin\Dsl\S;

it('serializes a form tab with a string icon normalized and a string badge', function (): void {
    $s = new S;
    $node = $s->tabs([
        ['label' => 'Main', 'body' => $s->displayText('Body'), 'icon' => 'star', 'badge' => 3],
        ['label' => 'More', 'body' => $s->displayText('More body')],
    ]);

    $tabs = $node->options['tabs'];

    expect($tabs[0]['label'])->toBe('Main')
        ->and($tabs[0]['icon'])->toBe(['name' => 'star', 'position' => 'left'])
        ->and($tabs[0]['badge'])->toBe('3')
        ->and($tabs[1])->not->toHaveKey('icon')
        ->and($tabs[1])->not->toHaveKey('badge');
});

it('preserves an explicit form-tab icon position', function (): void {
    $s = new S;
    $node = $s->tabs([
        ['label' => 'Main', 'body' => $s->displayText('Body'), 'icon' => ['name' => 'check', 'position' => 'right']],
    ]);

    expect($node->options['tabs'][0]['icon'])->toBe(['name' => 'check', 'position' => 'right']);
});
