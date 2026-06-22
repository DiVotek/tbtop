<?php

use Tbtop\Admin\Dsl\S;

it('RuleWalker: multiple upload yields nullable array with max from maxFiles', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->maxFiles(5),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['nullable', 'array', 'max:5'],
    ]);
});

it('RuleWalker: multiple upload without maxFiles yields nullable array only', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('photos')->multiple(),
    ]);

    expect($form->collectRules())->toBe([
        'photos' => ['nullable', 'array'],
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
