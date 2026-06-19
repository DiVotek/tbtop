<?php

use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\S;

function encodeAction(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

// --- ActionBuilder: shorthand form ---

it('CondActionBuilder: hiddenIf shorthand eq maps = symbol', function () {
    $s = new S;
    $action = $s->action('approve')->visit('/x')->hiddenIf('status', '=', 'done');

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'eq', 'field' => 'status', 'value' => 'done']);
});

it('CondActionBuilder: hiddenIf shorthand neq maps != symbol', function () {
    $s = new S;
    $action = $s->action('approve')->visit('/x')->hiddenIf('status', '!=', 'pending');

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'neq', 'field' => 'status', 'value' => 'pending']);
});

it('CondActionBuilder: hiddenIf shorthand gt maps > symbol', function () {
    $s = new S;
    $action = $s->action('flag')->visit('/x')->hiddenIf('views', '>', 100);

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'gt', 'field' => 'views', 'value' => 100]);
});

it('CondActionBuilder: hiddenIf shorthand in maps in symbol', function () {
    $s = new S;
    $action = $s->action('manage')->visit('/x')->hiddenIf('role', 'in', ['manager', 'viewer']);

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'in', 'field' => 'role', 'value' => ['manager', 'viewer']]);
});

it('CondActionBuilder: hiddenIf shorthand empty maps empty keyword (2-arg form)', function () {
    $s = new S;
    $action = $s->action('publish')->visit('/x')->hiddenIf('published_at', 'empty');

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'empty', 'field' => 'published_at']);
});

it('CondActionBuilder: hiddenIf shorthand truthy maps truthy keyword', function () {
    $s = new S;
    $action = $s->action('unpublish')->visit('/x')->hiddenIf('published', 'truthy');

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'truthy', 'field' => 'published']);
});

// --- ActionBuilder: object form ---

it('CondActionBuilder: hiddenIf object form stores Cond directly', function () {
    $s = new S;
    $action = $s->action('archive')->visit('/x')->hiddenIf(
        Cond::all(Cond::eq('status', 'draft'), Cond::empty('published_at'))
    );

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe([
        'op' => 'all',
        'conds' => [
            ['op' => 'eq', 'field' => 'status', 'value' => 'draft'],
            ['op' => 'empty', 'field' => 'published_at'],
        ],
    ]);
});

it('CondActionBuilder: disabledIf shorthand lands in meta bag without hiddenIf', function () {
    $s = new S;
    $action = $s->action('delete')->visit('/x')->disabledIf('locked', 'truthy');

    $json = encodeAction($action);

    expect($json['meta']['disabledIf'])->toBe(['op' => 'truthy', 'field' => 'locked']);
    expect($json['meta'])->not->toHaveKey('hiddenIf');
});

it('CondActionBuilder: role-gated bulk hiddenIf serializes for the user condition', function () {
    $s = new S;
    $action = $s->action('disable-user')->visit('/x')->hiddenIf('role', '=', 'manager');

    $json = encodeAction($action);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'eq', 'field' => 'role', 'value' => 'manager']);
});

it('CondActionBuilder: action without conds has empty meta', function () {
    $s = new S;
    $action = $s->action('edit')->visit('/x');

    $json = encodeAction($action);

    expect($json['meta'])->toBe([]);
});
