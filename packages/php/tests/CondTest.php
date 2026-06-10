<?php

use Tbtop\Admin\Dsl\Cond;

function encodeCond(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('Cond: eq serializes to wire shape', function () {
    $result = encodeCond(Cond::eq('type', 'video'));

    expect($result)->toBe(['op' => 'eq', 'field' => 'type', 'value' => 'video']);
});

it('Cond: neq serializes to wire shape', function () {
    $result = encodeCond(Cond::neq('status', 'draft'));

    expect($result)->toBe(['op' => 'neq', 'field' => 'status', 'value' => 'draft']);
});

it('Cond: in serializes to wire shape', function () {
    $result = encodeCond(Cond::in('role', ['admin', 'editor']));

    expect($result)->toBe(['op' => 'in', 'field' => 'role', 'value' => ['admin', 'editor']]);
});

it('Cond: notIn serializes to wire shape', function () {
    $result = encodeCond(Cond::notIn('status', ['archived', 'deleted']));

    expect($result)->toBe(['op' => 'notIn', 'field' => 'status', 'value' => ['archived', 'deleted']]);
});

it('Cond: empty serializes to wire shape without value key', function () {
    $result = encodeCond(Cond::empty('published_at'));

    expect($result)->toBe(['op' => 'empty', 'field' => 'published_at']);
});

it('Cond: notEmpty serializes to wire shape without value key', function () {
    $result = encodeCond(Cond::notEmpty('title'));

    expect($result)->toBe(['op' => 'notEmpty', 'field' => 'title']);
});

it('Cond: truthy serializes to wire shape without value key', function () {
    $result = encodeCond(Cond::truthy('published'));

    expect($result)->toBe(['op' => 'truthy', 'field' => 'published']);
});

it('Cond: gt serializes to wire shape', function () {
    $result = encodeCond(Cond::gt('rating', 3));

    expect($result)->toBe(['op' => 'gt', 'field' => 'rating', 'value' => 3]);
});

it('Cond: gte serializes to wire shape', function () {
    $result = encodeCond(Cond::gte('rating', 3));

    expect($result)->toBe(['op' => 'gte', 'field' => 'rating', 'value' => 3]);
});

it('Cond: lt serializes to wire shape', function () {
    $result = encodeCond(Cond::lt('rating', 5));

    expect($result)->toBe(['op' => 'lt', 'field' => 'rating', 'value' => 5]);
});

it('Cond: lte serializes to wire shape', function () {
    $result = encodeCond(Cond::lte('rating', 5));

    expect($result)->toBe(['op' => 'lte', 'field' => 'rating', 'value' => 5]);
});

it('Cond: all combinator serializes nested conditions', function () {
    $result = encodeCond(Cond::all(
        Cond::eq('status', 'draft'),
        Cond::empty('published_at'),
    ));

    expect($result)->toBe([
        'op' => 'all',
        'conds' => [
            ['op' => 'eq', 'field' => 'status', 'value' => 'draft'],
            ['op' => 'empty', 'field' => 'published_at'],
        ],
    ]);
});

it('Cond: any combinator serializes nested conditions', function () {
    $result = encodeCond(Cond::any(
        Cond::eq('type', 'image'),
        Cond::eq('type', 'video'),
    ));

    expect($result)->toBe([
        'op' => 'any',
        'conds' => [
            ['op' => 'eq', 'field' => 'type', 'value' => 'image'],
            ['op' => 'eq', 'field' => 'type', 'value' => 'video'],
        ],
    ]);
});

it('Cond: not combinator serializes wrapped condition', function () {
    $result = encodeCond(Cond::not(Cond::eq('status', 'archived')));

    expect($result)->toBe([
        'op' => 'not',
        'cond' => ['op' => 'eq', 'field' => 'status', 'value' => 'archived'],
    ]);
});

it('Cond: server reserved op serializes to wire shape', function () {
    $result = encodeCond(Cond::server());

    expect($result)->toBe(['op' => 'server']);
});
