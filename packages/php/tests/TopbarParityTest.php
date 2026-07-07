<?php

use Tbtop\Admin\Dsl\S;

it('themeToggle: builds a leaf node of kind themeToggle', function (): void {
    $node = (new S)->themeToggle();

    expect($node->kind)->toBe('themeToggle')
        ->and($node->options)->toBe([]);
});

it('visit: omits newTab by default', function (): void {
    $node = (new S)->action('go')->visit('/x')->toNode();

    expect($node->options['spec'])->toBe(['type' => 'visit', 'href' => '/x']);
});

it('visit: carries newTab into the spec when requested', function (): void {
    $node = (new S)->action('site')->visit('https://x.test', newTab: true)->toNode();

    expect($node->options['spec'])->toBe([
        'type' => 'visit',
        'href' => 'https://x.test',
        'newTab' => true,
    ]);
});
