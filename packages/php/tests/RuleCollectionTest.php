<?php

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
