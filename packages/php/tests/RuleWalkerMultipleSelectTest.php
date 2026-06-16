<?php

use Tbtop\Admin\Dsl\S;

it('RuleWalker: multiple select yields array on field key and in: on element key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('tags')->multiple()->rules('in:php,js,go'),
    ]);

    expect($form->collectRules())->toBe([
        'tags' => ['array'],
        'tags.*' => ['in:php,js,go'],
    ]);
});

it('RuleWalker: required multiple select puts required on field key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('categories')->multiple()->required()->rules('in:a,b'),
    ]);

    expect($form->collectRules())->toBe([
        'categories' => ['array', 'required'],
        'categories.*' => ['in:a,b'],
    ]);
});

it('RuleWalker: multiple select with no extra rules yields only array', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('flags')->multiple(),
    ]);

    expect($form->collectRules())->toBe([
        'flags' => ['array'],
    ]);
});

it('RuleWalker: non-multiple select is unaffected by multiple select logic', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('role')->rules('in:admin,editor'),
    ]);

    expect($form->collectRules())->toBe([
        'role' => ['in:admin,editor'],
    ]);
});

it('RuleWalker: size on multiple select lands on field key, not element key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('tags')->multiple()->rules('size:3'),
    ]);

    expect($form->collectRules())->toBe([
        'tags' => ['array', 'size:3'],
    ]);
});

it('RuleWalker: distinct on multiple select lands on field key, not element key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->select('tags')->multiple()->rules('distinct'),
    ]);

    expect($form->collectRules())->toBe([
        'tags' => ['array', 'distinct'],
    ]);
});
