<?php

use Tbtop\Admin\Dsl\S;

function encodeTranslatable(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('emits translatable:true on the wire when ->translatable() is called', function () {
    $s = new S;
    $json = encodeTranslatable($s->text('title')->translatable());

    expect($json['options']['translatable'])->toBeTrue()
        ->and($json['kind'])->toBe('text');
});

it('does not emit translatable flag when ->translatable() is not called', function () {
    $s = new S;
    $json = encodeTranslatable($s->text('title'));

    expect($json['options'])->not->toHaveKey('translatable');
});

it('translatable(false) opts out and does not emit the flag', function () {
    $s = new S;
    $json = encodeTranslatable($s->text('title')->translatable(false));

    expect($json['options'])->not->toHaveKey('translatable');
});

it('group row cascade sets translatable on all descendant fields', function () {
    $s = new S;
    $node = $s->row([
        $s->text('title'),
        $s->textarea('body'),
    ])->translatable();

    $children = $node->options['children'];
    expect($children[0]->toNode()->options['translatable'])->toBeTrue()
        ->and($children[1]->toNode()->options['translatable'])->toBeTrue();
});

it('group section cascade sets translatable on all descendant fields', function () {
    $s = new S;
    $node = $s->section(['title' => 'Main'], [
        $s->text('title'),
        $s->richtext('body'),
    ])->translatable();

    $children = $node->options['children'];
    expect($children[0]->toNode()->options['translatable'])->toBeTrue()
        ->and($children[1]->toNode()->options['translatable'])->toBeTrue();
});

it('opt-out on a field inside a translatable group wins', function () {
    $s = new S;
    $node = $s->row([
        $s->text('title'),
        $s->text('slug')->translatable(false),
    ])->translatable();

    $children = $node->options['children'];
    expect($children[0]->toNode()->options['translatable'])->toBeTrue();
    // slug opted out — should not have the flag
    expect($children[1]->toNode()->options)->not->toHaveKey('translatable');
});

it('default-locale-only validation: translatable field uses field rules for default locale only', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('post', [
        $s->text('title')->required()->rules('max:200')->translatable(),
    ]);

    $rules = $form->collectRules();

    expect($rules['title'])->toBe(['nullable', 'array'])
        ->and($rules['title.en'])->toBe(['required', 'max:200'])
        ->and($rules['title.uk'])->toBe(['nullable']);
});

it('rulesForLocale overrides rules for a specific locale', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('post', [
        $s->text('title')->required()->translatable()->rulesForLocale('uk', 'required|max:150'),
    ]);

    $rules = $form->collectRules();

    expect($rules['title.en'])->toBe(['required'])
        ->and($rules['title.uk'])->toBe(['required', 'max:150']);
});

it('translatable field with no explicit rules gets nullable baseline for all locales', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('post', [
        $s->textarea('body')->translatable(),
    ]);

    $rules = $form->collectRules();

    expect($rules['body'])->toBe(['nullable', 'array'])
        ->and($rules['body.en'])->toBe(['nullable'])
        ->and($rules['body.uk'])->toBe(['nullable']);
});

it('translatable subfield inside a repeater expands to items.*.field.locale rules', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label')->required()->translatable(),
        ]),
    ]);

    $rules = $form->collectRules();

    expect($rules['items.*.label'])->toBe(['nullable', 'array'])
        ->and($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable']);
});

it('translatable subfield inside a nested (depth-2) repeater expands correctly', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label')->required()->translatable(),
            $s->repeater('children')->fields([
                $s->text('label')->required()->translatable(),
            ]),
        ]),
    ]);

    $rules = $form->collectRules();

    expect($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable'])
        ->and($rules['items.*.children.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.children.*.label.uk'])->toBe(['nullable']);
});

it('translatable subfield inside a repeater emits per-locale validator attributes', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label')->label('Label')->required()->translatable(),
        ]),
    ]);

    $attributes = $form->collectAttributes();

    expect($attributes['items.*.label.en'])->toBe('Label (en)')
        ->and($attributes['items.*.label.uk'])->toBe('Label (uk)');
});

it('translatable() on a repeater cascades to sub-fields instead of making the repeater a locale map', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label')->required(),
        ])->translatable(),
    ]);

    $rules = $form->collectRules();

    expect($rules)->not->toHaveKey('items.en')
        ->and($rules)->not->toHaveKey('items.uk')
        ->and($rules['items'])->toBe(['nullable'])
        ->and($rules['items.*.label'])->toBe(['nullable', 'array'])
        ->and($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable']);
});

it('the repeater cascade does not depend on translatable() and fields() call order', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->translatable()->fields([
            $s->text('label')->required(),
        ]),
    ]);

    $rules = $form->collectRules();

    expect($rules)->not->toHaveKey('items.en')
        ->and($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable']);
});

it('section cascade reaches sub-fields of a repeater among its children', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->section(['title' => 'Main'], [
            $s->repeater('items')->fields([
                $s->text('label')->required(),
            ]),
        ])->translatable(),
    ]);

    $rules = $form->collectRules();

    expect($rules)->not->toHaveKey('items.en')
        ->and($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable']);
});

it('translatable() on an outer repeater cascades through a nested repeater', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label')->required(),
            $s->repeater('children')->fields([
                $s->text('label')->required(),
            ]),
        ])->translatable(),
    ]);

    $rules = $form->collectRules();

    expect($rules)->not->toHaveKey('items.en')
        ->and($rules)->not->toHaveKey('items.*.children.en')
        ->and($rules['items.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.label.uk'])->toBe(['nullable'])
        ->and($rules['items.*.children.*.label.en'])->toBe(['required'])
        ->and($rules['items.*.children.*.label.uk'])->toBe(['nullable']);
});

it('translatable() on a repeater emits per-locale attributes for sub-fields, not for the repeater', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->label('Items')->fields([
            $s->text('label')->label('Label')->required(),
        ])->translatable(),
    ]);

    $attributes = $form->collectAttributes();

    expect($attributes)->not->toHaveKey('items.en')
        ->and($attributes['items'])->toBe('Items')
        ->and($attributes['items.*.label.en'])->toBe('Label (en)')
        ->and($attributes['items.*.label.uk'])->toBe('Label (uk)');
});

it('reading a record keeps a translatable repeater value as a row list, not a locale map', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label'),
        ])->translatable(),
    ])->record(['items' => [['label' => ['en' => 'Home', 'uk' => 'Головна']]]]);

    expect($form->recordData()['items'])
        ->toBe([['label' => ['en' => 'Home', 'uk' => 'Головна']]]);
});

it('reading a record does not wrap a translatable repeater scalar into a locale map', function () {
    $s = new S;
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);

    // A column holding a not-yet-decoded scalar must not be mistaken for a
    // translatable leaf just because the repeater carries the cascade flag.
    $form = $s->form('menu', [
        $s->repeater('items')->fields([
            $s->text('label'),
        ])->translatable(),
    ])->record(['items' => 'legacy']);

    expect($form->recordData()['items'])->toBe('legacy');
});

it('a translatable repeater does not advertise itself as a translatable field on the wire', function () {
    $s = new S;
    $json = encodeTranslatable(
        $s->repeater('items')->fields([$s->text('label')])->translatable()
    );

    expect($json['options'])->not->toHaveKey('translatable')
        ->and($json['options']['fields'][0]['options']['translatable'])->toBeTrue();
});
