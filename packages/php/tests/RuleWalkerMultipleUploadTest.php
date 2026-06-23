<?php

use Tbtop\Admin\Dsl\S;

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
