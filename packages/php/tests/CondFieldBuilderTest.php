<?php

use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\S;

function encodeField(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

// --- FieldBuilder: shorthand form ---

it('CondFieldBuilder: hiddenIf shorthand eq maps = symbol', function () {
    $s = new S;
    $field = $s->text('url_embed')->hiddenIf('type', '=', 'text');

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'eq', 'field' => 'type', 'value' => 'text']);
});

it('CondFieldBuilder: hiddenIf shorthand neq maps != symbol', function () {
    $s = new S;
    $field = $s->text('url_embed')->hiddenIf('type', '!=', 'video');

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'neq', 'field' => 'type', 'value' => 'video']);
});

it('CondFieldBuilder: hiddenIf shorthand gt maps > symbol', function () {
    $s = new S;
    $field = $s->number('discount')->hiddenIf('rating', '>', 3);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'gt', 'field' => 'rating', 'value' => 3]);
});

it('CondFieldBuilder: hiddenIf shorthand gte maps >= symbol', function () {
    $s = new S;
    $field = $s->number('discount')->hiddenIf('rating', '>=', 3);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'gte', 'field' => 'rating', 'value' => 3]);
});

it('CondFieldBuilder: hiddenIf shorthand lt maps < symbol', function () {
    $s = new S;
    $field = $s->number('discount')->hiddenIf('rating', '<', 5);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'lt', 'field' => 'rating', 'value' => 5]);
});

it('CondFieldBuilder: hiddenIf shorthand lte maps <= symbol', function () {
    $s = new S;
    $field = $s->number('discount')->hiddenIf('rating', '<=', 5);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'lte', 'field' => 'rating', 'value' => 5]);
});

it('CondFieldBuilder: hiddenIf shorthand in maps in symbol', function () {
    $s = new S;
    $field = $s->text('extra')->hiddenIf('role', 'in', ['admin', 'editor']);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'in', 'field' => 'role', 'value' => ['admin', 'editor']]);
});

it('CondFieldBuilder: hiddenIf shorthand notIn maps not in symbol', function () {
    $s = new S;
    $field = $s->text('extra')->hiddenIf('role', 'not in', ['viewer']);

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'notIn', 'field' => 'role', 'value' => ['viewer']]);
});

it('CondFieldBuilder: hiddenIf shorthand empty maps empty keyword (2-arg form)', function () {
    $s = new S;
    $field = $s->date('published_at')->hiddenIf('title', 'empty');

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'empty', 'field' => 'title']);
});

it('CondFieldBuilder: hiddenIf shorthand notEmpty maps not empty keyword', function () {
    $s = new S;
    $field = $s->date('published_at')->hiddenIf('title', 'not empty');

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'notEmpty', 'field' => 'title']);
});

it('CondFieldBuilder: hiddenIf shorthand truthy maps truthy keyword', function () {
    $s = new S;
    $field = $s->date('published_at')->hiddenIf('published', 'truthy');

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'truthy', 'field' => 'published']);
});

// --- FieldBuilder: object form ---

it('CondFieldBuilder: hiddenIf object form stores Cond directly', function () {
    $s = new S;
    $field = $s->text('caption')->hiddenIf(
        Cond::all(Cond::eq('status', 'draft'), Cond::empty('published_at'))
    );

    $json = encodeField($field);

    expect($json['meta']['hiddenIf'])->toBe([
        'op' => 'all',
        'conds' => [
            ['op' => 'eq', 'field' => 'status', 'value' => 'draft'],
            ['op' => 'empty', 'field' => 'published_at'],
        ],
    ]);
});

it('CondFieldBuilder: disabledIf shorthand lands in meta bag', function () {
    $s = new S;
    $field = $s->text('slug')->disabledIf('type', '=', 'auto');

    $json = encodeField($field);

    expect($json['meta']['disabledIf'])->toBe(['op' => 'eq', 'field' => 'type', 'value' => 'auto']);
    expect($json['meta'])->not->toHaveKey('hiddenIf');
});

it('CondFieldBuilder: disabledIf object form stores Cond directly', function () {
    $s = new S;
    $field = $s->text('slug')->disabledIf(
        Cond::any(Cond::eq('status', 'published'), Cond::truthy('locked'))
    );

    $json = encodeField($field);

    expect($json['meta']['disabledIf'])->toBe([
        'op' => 'any',
        'conds' => [
            ['op' => 'eq', 'field' => 'status', 'value' => 'published'],
            ['op' => 'truthy', 'field' => 'locked'],
        ],
    ]);
});

// --- Section / layout builder ---

it('CondFieldBuilder: section node carries hiddenIf in meta when passed via opts', function () {
    $s = new S;
    $section = $s->section(
        ['title' => 'Video settings', 'hiddenIf' => Cond::neq('type', 'video')],
        [$s->text('url')],
    );

    $json = encodeField($section);

    expect($json['meta']['hiddenIf'])->toBe(['op' => 'neq', 'field' => 'type', 'value' => 'video']);
    expect($json['options'])->not->toHaveKey('hiddenIf');
});

it('CondFieldBuilder: stack node carries disabledIf in meta when passed via opts', function () {
    $s = new S;
    $stack = $s->stack(
        [$s->text('caption')],
        ['disabledIf' => Cond::eq('locked', true)],
    );

    $json = encodeField($stack);

    expect($json['meta']['disabledIf'])->toBe(['op' => 'eq', 'field' => 'locked', 'value' => true]);
    expect($json['options'])->not->toHaveKey('disabledIf');
});
