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
