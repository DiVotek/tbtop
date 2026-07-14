<?php

use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\S;

it('collects laravel rules from fields nested in layout', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->section(['title' => 'Main'], [
            $s->text('title')->required()->rules('max:200'),
            $s->number('rating')->rules('numeric'),
        ]),
    ]);

    expect($form->collectRules())->toBe([
        'title' => ['required', 'max:200'],
        'rating' => ['numeric'],
    ]);
});

it('prefixes repeater sub-field rules with parent.*.', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->repeater('sections')->rules('array|max:10')->set('fields', [
            $s->text('heading')->required(),
            $s->textarea('body'),
        ]),
    ]);

    expect($form->collectRules())->toBe([
        'sections' => ['array', 'max:10'],
        'sections.*.heading' => ['required'],
        'sections.*.body' => ['nullable'],
    ]);
});

it('prefixes nested repeater rules through both levels', function () {
    $s = new S;
    $form = $s->form('menu', [
        $s->repeater('items')->set('fields', [
            $s->text('label')->required(),
            $s->repeater('children')->set('fields', [
                $s->text('label')->required(),
            ]),
        ]),
    ]);

    expect($form->collectRules())->toBe([
        'items' => ['nullable'],
        'items.*.label' => ['required'],
        'items.*.children' => ['nullable'],
        'items.*.children.*.label' => ['required'],
    ]);
});

// A regex: pattern passed as a string would be split on its own '|'. The shared
// CollectsRules guard rejects it on both Field and Column; pass it as an array.

it('rejects a regex: rule passed as a string on a field', function () {
    $s = new S;

    expect(fn () => $s->slug('slug')->rules('regex:/^[a-z]+$/'))
        ->toThrow(InvalidArgumentException::class, 'pass regex rules as an array');
});

it('rejects a regex: rule passed as a string on an editable column', function () {
    expect(fn () => Column::make('slug')->textInput()->rules('regex:/^[a-z]+$/'))
        ->toThrow(InvalidArgumentException::class, 'pass regex rules as an array');
});

it('accepts a regex: rule passed as an array element on a column', function () {
    $col = Column::make('slug')->textInput()->rules(['regex:/^[a-z]+$/']);

    expect($col->editRuleEntries())->toBe(['regex:/^[a-z]+$/']);
});
