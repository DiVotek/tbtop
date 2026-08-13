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

it('serializes named tabs for stable URL state', function (): void {
    $s = new S;
    $node = $s->tabs([
        ['name' => 'general', 'label' => 'General settings', 'body' => $s->displayText('General')],
        ['name' => 'seo', 'body' => $s->displayText('SEO')],
    ], ['name' => 'post']);

    expect($node->name)->toBe('post')
        ->and($node->options)->not->toHaveKey('name')
        ->and($node->options['tabs'][0]['name'])->toBe('general')
        ->and($node->options['tabs'][0]['label'])->toBe('General settings')
        ->and($node->options['tabs'][1]['name'])->toBe('seo')
        ->and($node->options['tabs'][1]['label'])->toBe('seo');
});

it('keeps unnamed tabs wire-compatible', function (): void {
    $s = new S;
    $encoded = $s->tabs([
        ['label' => 'General', 'body' => $s->displayText('Body')],
    ])->jsonSerialize();

    expect($encoded)->not->toHaveKey('name')
        ->and($encoded['options']['tabs'][0])->not->toHaveKey('name')
        ->and($encoded['options']['tabs'][0]['label'])->toBe('General');
});

it('requires unique tab names throughout a named block', function (array $tabs): void {
    (new S)->tabs($tabs, ['name' => 'post']);
})->with([
    'missing name' => [[
        ['label' => 'General', 'body' => (new S)->displayText('General')],
    ]],
    'duplicate name' => [[
        ['name' => 'general', 'body' => (new S)->displayText('General')],
        ['name' => 'general', 'body' => (new S)->displayText('Other')],
    ]],
])->throws(InvalidArgumentException::class);
