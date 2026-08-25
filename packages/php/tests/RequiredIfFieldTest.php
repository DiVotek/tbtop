<?php

use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\S;

function encodeRequiredIfField(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('Field::requiredIf shorthand form sets meta.requiredIf and the derived server rule', function () {
    $s = new S;
    $field = $s->text('company_name')->requiredIf('type', '=', 'company');

    $json = encodeRequiredIfField($field);

    expect($json['meta']['requiredIf'])->toBe(['op' => 'eq', 'field' => 'type', 'value' => 'company']);
    expect($field->ruleEntries())->toBe(['required_if:type,company']);
});

it('Field::requiredIf object form stores the Cond directly', function () {
    $s = new S;
    $field = $s->text('company_name')->requiredIf(Cond::in('role', ['admin', 'editor']));

    $json = encodeRequiredIfField($field);

    expect($json['meta']['requiredIf'])->toBe(['op' => 'in', 'field' => 'role', 'value' => ['admin', 'editor']]);
    expect($field->ruleEntries())->toBe(['required_if:role,admin,editor']);
});

it('Field::requiredIf does not set options.required (asterisk is conditional, not static)', function () {
    $s = new S;
    $field = $s->text('company_name')->requiredIf('type', '=', 'company');

    $json = encodeRequiredIfField($field);

    expect($json['options'])->not->toHaveKey('required');
    expect($json['options'])->not->toHaveKey('constraints');
});

it('Field::markAsRequired sets options.required with no rule and no constraint', function () {
    $s = new S;
    $field = $s->text('company_name')->markAsRequired();

    $json = encodeRequiredIfField($field);

    expect($json['options']['required'])->toBeTrue();
    expect($field->ruleEntries())->toBe([]);
    expect($json['options'])->not->toHaveKey('constraints');
});

it('Field::markAsRequired(false) sets options.required to false', function () {
    $s = new S;
    $field = $s->text('company_name')->markAsRequired(false);

    $json = encodeRequiredIfField($field);

    expect($json['options']['required'])->toBeFalse();
});

it('Field::required is unaffected by requiredIf/markAsRequired existing', function () {
    $s = new S;
    $field = $s->text('title')->required();

    $json = encodeRequiredIfField($field);

    expect($json['options']['required'])->toBeTrue();
    expect($field->ruleEntries())->toBe(['required']);
    expect($json['options']['constraints'])->toBe(['required' => true]);
});
