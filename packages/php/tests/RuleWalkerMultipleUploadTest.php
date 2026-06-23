<?php

use Tbtop\Admin\Dsl\S;

uses(Tbtop\Admin\Tests\TestCase::class);

it('RuleWalker: multiple upload auto-injects max from maxFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->maxFiles(5),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['array', 'max:5'],
        'gallery.*' => ['string'],
    ]);
});

it('RuleWalker: multiple upload without maxFiles yields array + string elements', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('photos')->multiple(),
    ]);

    expect($form->collectRules())->toBe([
        'photos' => ['array'],
        'photos.*' => ['string'],
    ]);
});

it('RuleWalker: required multiple upload puts required on field key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('docs')->multiple()->maxFiles(3)->required(),
    ]);

    expect($form->collectRules())->toBe([
        'docs' => ['array', 'required', 'max:3'],
        'docs.*' => ['string'],
    ]);
});

it('RuleWalker: explicit max rule on multiple upload takes precedence over maxFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('files')->multiple()->maxFiles(10)->rules('max:3'),
    ]);

    expect($form->collectRules())->toBe([
        'files' => ['array', 'max:3'],
        'files.*' => ['string'],
    ]);
});

it('RuleWalker: non-multiple upload defaults to nullable string', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('avatar'),
    ]);

    expect($form->collectRules())->toBe([
        'avatar' => ['nullable', 'string'],
    ]);
});

it('RuleWalker: required non-multiple upload still requires a string path', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('avatar')->required(),
    ]);

    expect($form->collectRules())->toBe([
        'avatar' => ['required', 'string'],
    ]);
});

it('RuleWalker: translatable upload validates locale values as string paths', function () {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);
    $s = new S;
    $form = $s->form('post', [
        $s->upload('avatar')->required()->translatable(),
    ]);

    expect($form->collectRules())->toBe([
        'avatar' => ['nullable', 'array'],
        'avatar.en' => ['required', 'string'],
        'avatar.uk' => ['nullable', 'string'],
    ]);
});

it('RuleWalker: translatable multiple upload validates locale arrays and elements', function () {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    config(['tbtop-admin.default_content_locale' => 'en']);
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->maxFiles(2)->translatable(),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['nullable', 'array'],
        'gallery.en' => ['array', 'max:2'],
        'gallery.en.*' => ['string'],
        'gallery.uk' => ['array', 'nullable', 'max:2'],
        'gallery.uk.*' => ['string'],
    ]);
});
