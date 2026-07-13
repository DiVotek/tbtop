<?php

use Tbtop\Admin\Dsl\S;

it('collects an attribute label for a plain labeled field', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->text('title')->label('Title')->required(),
        $s->number('rating')->rules('numeric'),
    ]);

    expect($form->collectAttributes())->toBe(['title' => 'Title']);
});

it('omits fields without a label from the attributes map', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->text('slug')->required(),
    ]);

    expect($form->collectAttributes())->toBe([]);
});

it('expands a labeled translatable field into per-locale attributes', function () {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    $s = new S;
    $form = $s->form('post', [
        $s->text('title')->label('Title')->translatable()->required(),
    ]);

    expect($form->collectAttributes())->toBe([
        'title.en' => 'Title (en)',
        'title.uk' => 'Title (uk)',
    ]);
});

it('prefixes a labeled repeater child attribute with parent.*.', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->repeater('sections')->set('fields', [
            $s->text('heading')->label('Heading')->required(),
            $s->textarea('body'),
        ]),
    ]);

    expect($form->collectAttributes())->toBe([
        'sections.*.heading' => 'Heading',
    ]);
});

it('collects attributes from fields nested in layout containers', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->section(['title' => 'Main'], [
            $s->text('title')->label('Title'),
        ]),
    ]);

    expect($form->collectAttributes())->toBe(['title' => 'Title']);
});
