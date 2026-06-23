<?php

use Tbtop\Admin\Dsl\S;

it('RuleWalker: multiple upload auto-injects max from maxFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->maxFiles(5),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['array', 'max:5'],
    ]);
});

it('RuleWalker: multiple upload without maxFiles yields array only', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('photos')->multiple(),
    ]);

    expect($form->collectRules())->toBe([
        'photos' => ['array'],
    ]);
});

it('RuleWalker: required multiple upload puts required on field key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('docs')->multiple()->maxFiles(3)->required(),
    ]);

    expect($form->collectRules())->toBe([
        'docs' => ['array', 'required', 'max:3'],
    ]);
});

it('RuleWalker: explicit max rule on multiple upload takes precedence over maxFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('files')->multiple()->maxFiles(10)->rules('max:3'),
    ]);

    expect($form->collectRules())->toBe([
        'files' => ['array', 'max:3'],
    ]);
});

it('RuleWalker: multiple upload auto-injects min from minFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->minFiles(2)->maxFiles(5),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['array', 'min:2', 'max:5'],
    ]);
});

it('RuleWalker: explicit min rule on multiple upload takes precedence over minFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('files')->multiple()->minFiles(2)->rules('min:1'),
    ]);

    expect($form->collectRules())->toBe([
        'files' => ['array', 'min:1'],
    ]);
});

it('RuleWalker: non-multiple upload is unaffected by multiple upload logic', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('avatar'),
    ]);

    expect($form->collectRules())->toBe([
        'avatar' => ['nullable'],
    ]);
});
