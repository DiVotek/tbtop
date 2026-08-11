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

it('seeds a dotted dependency from a translatable record value', function (): void {
    $s = new S;
    $seen = [];
    $region = $s->liveRegion('preview')
        ->dependsOn(['title.en', 'title.uk', 'slug'])
        ->render(function (array $deps, S $r) use (&$seen) {
            $seen = $deps;

            return [$r->displayText('ok')];
        });

    // The record shape a translatable field produces: a locale map, never a
    // scalar — plus a plain field alongside it. The empty uk entry drops out
    // the same way an empty scalar would.
    $region->seedInitialDeps(['title' => ['en' => 'Hello', 'uk' => ''], 'slug' => 'about']);
    $region->toNode();

    expect($seen)->toBe(['title.en' => 'Hello', 'title.uk' => '', 'slug' => 'about']);
});

it('prefers a literal dotted record key over locale-map lookup', function (): void {
    $s = new S;
    $seen = [];
    $region = $s->liveRegion('preview')
        ->dependsOn('a.b')
        ->render(function (array $deps, S $r) use (&$seen) {
            $seen = $deps;

            return [$r->displayText('ok')];
        });

    $region->seedInitialDeps(['a.b' => 'literal', 'a' => ['b' => 'nested']]);
    $region->toNode();

    expect($seen)->toBe(['a.b' => 'literal']);
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
