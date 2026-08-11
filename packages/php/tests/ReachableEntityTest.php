<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\S;

// ---------------------------------------------------------------------------
// S::reachable* — the endpoint controllers' lookup
// ---------------------------------------------------------------------------
// Builders register at construction, so a when(false) entity is still in the
// collector map. The lookup applies the verdict the wire already applies, which
// is what keeps a hidden entity's endpoint from answering.

it('resolves a visible table and hides a when(false) one', function (): void {
    $s = new S;
    $s->table('shown')->query(fn () => null);
    $s->table('hidden')->query(fn () => null)->when(false);

    expect($s->reachableTable('shown'))->not->toBeNull()
        ->and($s->reachableTable('hidden'))->toBeNull()
        ->and($s->reachableTable('never_registered'))->toBeNull();
});

it('resolves a visible form and hides a when(false) one', function (): void {
    $s = new S;
    $s->form('shown', [$s->text('a')]);
    $s->form('hidden', [$s->text('a')])->when(false);

    expect($s->reachableForm('shown'))->not->toBeNull()
        ->and($s->reachableForm('hidden'))->toBeNull();
});

it('resolves a visible chart and hides a when(false) one', function (): void {
    $s = new S;
    $s->chart('shown', 'donut', ['nameKey' => 'label'])->query(fn () => []);
    $s->chart('hidden', 'donut', ['nameKey' => 'label'])->query(fn () => [])->when(false);

    expect($s->reachableChart('shown'))->not->toBeNull()
        ->and($s->reachableChart('hidden'))->toBeNull();
});

it('resolves a visible stat and hides a when(false) one', function (): void {
    $s = new S;
    $s->stat('shown')->value(fn (): int => 1)->poll(5);
    $s->stat('hidden')->value(fn (): int => 1)->poll(5)->when(false);

    expect($s->reachableStat('shown'))->not->toBeNull()
        ->and($s->reachableStat('hidden'))->toBeNull();
});

it('resolves a visible action and hides a when(false) one', function (): void {
    $s = new S;
    $s->action('shown')->handle(fn (ActionCtx $ctx): Effects => Effects::make(), needs: []);
    $s->action('hidden')
        ->handle(fn (ActionCtx $ctx): Effects => Effects::make(), needs: [])
        ->when(false);

    expect($s->reachableAction('shown'))->not->toBeNull()
        ->and($s->reachableAction('hidden'))->toBeNull();
});

it('hides an action whose ability is denied, the second reachability rule', function (): void {
    Gate::define('never', fn (?object $user) => false);
    Gate::define('always', fn (?object $user) => true);

    $s = new S;
    $s->action('allowed')
        ->handle(fn (ActionCtx $ctx): Effects => Effects::make(), needs: [])
        ->authorize('always');
    $s->action('denied')
        ->handle(fn (ActionCtx $ctx): Effects => Effects::make(), needs: [])
        ->authorize('never');

    expect($s->reachableAction('allowed'))->not->toBeNull()
        ->and($s->reachableAction('denied'))->toBeNull();
});

it('re-reads a when() closure per lookup rather than caching across requests', function (): void {
    $allow = false;
    $s = new S;
    $s->table('toggled')->query(fn () => null)->when(function () use (&$allow): bool {
        return $allow;
    });

    expect($s->reachableTable('toggled'))->toBeNull();

    // A fresh page assembly is what a second request gets; the verdict must
    // follow the closure, not a decision frozen at registration.
    $allow = true;
    $s2 = new S;
    $s2->table('toggled')->query(fn () => null)->when(function () use (&$allow): bool {
        return $allow;
    });

    expect($s2->reachableTable('toggled'))->not->toBeNull();
});
