<?php

use Tbtop\Admin\Dsl\Fields\Number;
use Tbtop\Admin\Dsl\Fields\Otp;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Slider;
use Tbtop\Admin\Dsl\Fields\Text;

// Boundary: assert the rules a consumer's validator receives (ruleEntries),
// not builder internals. Each fluent helper must append the same Laravel rule
// a raw ->rules() call would.

it('maps string helpers to laravel rules', function () {
    $field = Text::make('title')
        ->minLength(3)
        ->maxLength(120)
        ->alphaNum()
        ->startsWith('a', 'b');

    expect($field->ruleEntries())->toBe(['min:3', 'max:120', 'alpha_num', 'starts_with:a,b']);
});

it('maps exact length to a size rule', function () {
    expect(Text::make('code')->length(8)->ruleEntries())->toBe(['size:8']);
});

it('passes regex through as an array element so the pipe guard does not fire', function () {
    $field = Text::make('handle')->regex('/^[a-z]+$/');

    expect($field->ruleEntries())->toBe(['regex:/^[a-z]+$/']);
});

it('maps numeric helpers to laravel rules', function () {
    // Range helpers pair with numeric so Laravel reads a value range, not length.
    $field = Number::make('age')->minValue(18)->maxValue(99)->multipleOf(1);

    expect($field->ruleEntries())->toBe(['numeric', 'min:18', 'max:99', 'multiple_of:1']);
});

it('maps between to a numeric range rule', function () {
    expect(Number::make('score')->between(0, 10)->ruleEntries())->toBe(['numeric', 'between:0,10']);
});

it('keeps slider structural min/max separate from validation minValue/maxValue', function () {
    $field = Slider::make('volume')->min(0)->max(11)->minValue(1);

    // Structural bounds live in opts; only minValue() becomes a rule.
    $node = $field->toNode()->jsonSerialize();
    expect($node['options']['min'] ?? null)->toBe(0)
        ->and($node['options']['max'] ?? null)->toBe(11)
        ->and($field->ruleEntries())->toBe(['numeric', 'min:1']);
});

it('maps generic helpers on any field', function () {
    $field = Text::make('password')->confirmed()->same('password_confirmation')->nullable();

    expect($field->ruleEntries())->toBe(['confirmed', 'same:password_confirmation', 'nullable']);
});

it('maps in / notIn to set rules', function () {
    expect(Text::make('role')->in(['admin', 'user'])->notIn(['root'])->ruleEntries())
        ->toBe(['in:admin,user', 'not_in:root']);
});

it('builds a unique rule defaulting the column to the field name', function () {
    expect(Text::make('email')->unique('users')->ruleEntries())->toBe(['unique:users,email']);
});

it('builds a unique rule with an explicit column', function () {
    expect(Text::make('email')->unique('users', 'email_address')->ruleEntries())
        ->toBe(['unique:users,email_address']);
});

it('appends the ignore segment to the unique rule', function () {
    $field = Text::make('email')->unique('users')->ignore(42);

    expect($field->ruleEntries())->toBe(['unique:users,email,42,id']);
});

it('ignores with a custom id column', function () {
    $field = Text::make('email')->unique('users')->ignore('uuid-1', 'uuid');

    expect($field->ruleEntries())->toBe(['unique:users,email,uuid-1,uuid']);
});

it('throws when ignore is called before unique', function () {
    expect(fn () => Text::make('email')->ignore(1))
        ->toThrow(LogicException::class, 'call unique() before ignore()');
});

it('builds an exists rule', function () {
    expect(Relation::make('author_id')->exists('users', 'id')->ruleEntries())
        ->toBe(['exists:users,id']);
});

it('exposes database helpers on select', function () {
    expect(Select::make('country')->exists('countries')->ruleEntries())
        ->toBe(['exists:countries,country']);
});

it('otp length sets the slot count and a digits rule together', function () {
    $field = Otp::make('code')->length(6);
    $node = $field->toNode()->jsonSerialize();

    expect($node['options']['length'] ?? null)->toBe(6)
        ->and($field->ruleEntries())->toBe(['digits:6']);
});

it('numeric between validates value range not string length', function () {
    // Regression: without the paired "numeric", Laravel reads between as a
    // character-length check, so a valid 30 would fail an 18-99 range.
    $rules = ['age' => Number::make('age')->between(18, 99)->ruleEntries()];

    expect(validator(['age' => 30], $rules)->passes())->toBeTrue()
        ->and(validator(['age' => 5], $rules)->fails())->toBeTrue()
        ->and(validator(['age' => 200], $rules)->fails())->toBeTrue();
});

it('min/max helpers surface as client wire constraints', function () {
    // min/max are in the ConstraintMap subset, so they also reach the client.
    $node = Text::make('title')->minLength(3)->maxLength(10)->toNode()->jsonSerialize();

    expect($node['options']['constraints'] ?? [])->toBe(['min' => 3, 'max' => 10]);
});

it('server-only helpers do not leak into wire constraints', function () {
    // alpha_num has no client mirror by design — server validates it.
    // Empty options serialize to an object, so assert the property is absent.
    $node = Text::make('handle')->alphaNum()->toNode()->jsonSerialize();

    expect($node['options'])->not->toHaveKey('constraints');
});
