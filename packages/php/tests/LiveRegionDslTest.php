<?php

use Tbtop\Admin\Dsl\S;

it('liveRegion render() rejects a field node — regions are display only', function (): void {
    $s = new S;
    $region = $s->liveRegion('preview')
        ->dependsOn('title')
        ->render(fn (array $deps, S $r) => [$r->text('oops')]);

    expect(fn () => $region->toNode())
        ->toThrow(InvalidArgumentException::class, 'display nodes only');
});

it('liveRegion render() rejects a field nested inside a container', function (): void {
    $s = new S;
    $region = $s->liveRegion('preview')
        ->dependsOn('title')
        ->render(fn (array $deps, S $r) => [
            $r->section(['title' => 'Card'], [$r->text('oops')]),
        ]);

    expect(fn () => $region->toNode())
        ->toThrow(InvalidArgumentException::class, 'display nodes only');
});

it('liveRegion render() accepts containers of display nodes', function (): void {
    $s = new S;
    $region = $s->liveRegion('preview')
        ->dependsOn('title')
        ->render(fn (array $deps, S $r) => [
            $r->section(['title' => 'Card'], [$r->displayText('fine')]),
        ]);

    $node = $region->toNode();

    expect($node->options['initial'])->toHaveCount(1);
});
