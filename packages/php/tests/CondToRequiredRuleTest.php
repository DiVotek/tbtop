<?php

use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\CondToRequiredRule;

it('CondToRequiredRule: maps each supported op to its Laravel rule string', function (Cond $cond, string $expected) {
    expect(CondToRequiredRule::rule($cond))->toBe($expected);
})->with([
    'eq' => [Cond::eq('type', 'company'), 'required_if:type,company'],
    'eq with boolean true' => [Cond::eq('published', true), 'required_if:published,true'],
    'eq with boolean false' => [Cond::eq('published', false), 'required_if:published,false'],
    'in' => [Cond::in('role', ['admin', 'editor']), 'required_if:role,admin,editor'],
    'neq' => [Cond::neq('status', 'draft'), 'required_unless:status,draft'],
    'notIn' => [Cond::notIn('status', ['archived', 'deleted']), 'required_unless:status,archived,deleted'],
    'notEmpty' => [Cond::notEmpty('parent_id'), 'required_with:parent_id'],
    'truthy' => [Cond::truthy('locked'), 'required_with:locked'],
    'empty' => [Cond::empty('published_at'), 'required_without:published_at'],
]);

it('CondToRequiredRule: rejects numeric-comparison ops with no server-side equivalent', function (Cond $cond, string $op) {
    expect(fn () => CondToRequiredRule::rule($cond))
        ->toThrow(InvalidArgumentException::class, "requiredIf: operator \"{$op}\" is not supported server-side");
})->with([
    'gt' => [Cond::gt('rating', 3), 'gt'],
    'gte' => [Cond::gte('rating', 3), 'gte'],
    'lt' => [Cond::lt('rating', 5), 'lt'],
    'lte' => [Cond::lte('rating', 5), 'lte'],
    'all' => [Cond::all(Cond::eq('a', 1), Cond::eq('b', 2)), 'all'],
    'any' => [Cond::any(Cond::eq('a', 1), Cond::eq('b', 2)), 'any'],
    'not' => [Cond::not(Cond::eq('a', 1)), 'not'],
    'server' => [Cond::server(), 'server'],
]);
