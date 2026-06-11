<?php

use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

function encodeForm(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

function bindPanelWithUnsavedGuardOff(): void
{
    app()->instance(
        CurrentPanel::class,
        new CurrentPanel((new PanelConfig)->id('admin')->unsavedGuard(false)),
    );
}

it('FormBuilder serializes guardUnsaved true when set', function () {
    $form = new FormBuilder('post');
    $form->guardUnsaved(true);

    $json = encodeForm($form);

    expect($json['options']['guardUnsaved'])->toBeTrue();
});

it('FormBuilder serializes guardUnsaved false when disabled', function () {
    $form = new FormBuilder('post');
    $form->guardUnsaved(false);

    $json = encodeForm($form);

    expect($json['options']['guardUnsaved'])->toBeFalse();
});

it('FormBuilder omits guardUnsaved when not set', function () {
    $form = new FormBuilder('post');

    $json = encodeForm($form);

    expect($json['options'])->not->toHaveKey('guardUnsaved');
});

it('FormBuilder guardUnsaved is fluent (returns self)', function () {
    $form = new FormBuilder('post');
    $result = $form->guardUnsaved(true);

    expect($result)->toBe($form);
});

it('FormBuilder serializes guardUnsaved false from the panel default when not set per-form', function () {
    bindPanelWithUnsavedGuardOff();

    $form = new FormBuilder('post');

    $json = encodeForm($form);

    expect($json['options']['guardUnsaved'])->toBeFalse();
});

it('FormBuilder explicit guardUnsaved wins over the panel default off', function () {
    bindPanelWithUnsavedGuardOff();

    $form = new FormBuilder('post');
    $form->guardUnsaved(true);

    $json = encodeForm($form);

    expect($json['options']['guardUnsaved'])->toBeTrue();
});

it('S helper form node forwards guardUnsaved to wire via FormBuilder', function () {
    $s = new S;
    $form = $s->form('post', []);
    $form->guardUnsaved(false);

    $json = encodeForm($form);

    expect($json['options']['guardUnsaved'])->toBeFalse();
});
