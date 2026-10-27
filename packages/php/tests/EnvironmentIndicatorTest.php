<?php

use Tbtop\Admin\Panels\PanelConfig;

function inEnvironment(string $env): void
{
    app()['env'] = $env;
}

it('ships no indicator until the panel enables it', function () {
    inEnvironment('staging');

    expect((new PanelConfig)->getEnvironmentIndicator())->toBeNull();
});

it('labels and colors the current environment by default', function (string $env, string $label, string $color) {
    inEnvironment($env);

    expect((new PanelConfig)->environmentIndicator()->getEnvironmentIndicator())
        ->toBe(['label' => $label, 'color' => $color]);
})->with([
    ['local', 'Local', 'success'],
    ['staging', 'Staging', 'warning'],
    ['testing', 'Testing', 'info'],
    ['qa', 'Qa', 'gray'],
]);

it('hides the indicator in production by default', function () {
    inEnvironment('production');

    expect((new PanelConfig)->environmentIndicator()->getEnvironmentIndicator())->toBeNull();
});

it('applies per-environment overrides and keeps defaults for the rest', function () {
    $panel = (new PanelConfig)->environmentIndicator([
        'staging' => 'danger',
        'qa' => ['label' => 'QA', 'color' => 'info'],
        'local' => false,
    ]);

    inEnvironment('staging');
    expect($panel->getEnvironmentIndicator())->toBe(['label' => 'Staging', 'color' => 'danger']);

    inEnvironment('qa');
    expect($panel->getEnvironmentIndicator())->toBe(['label' => 'QA', 'color' => 'info']);

    inEnvironment('local');
    expect($panel->getEnvironmentIndicator())->toBeNull();

    inEnvironment('testing');
    expect($panel->getEnvironmentIndicator())->toBe(['label' => 'Testing', 'color' => 'info']);
});

it('shows production when the overrides list it', function () {
    inEnvironment('production');

    expect((new PanelConfig)->environmentIndicator(['production' => 'danger'])->getEnvironmentIndicator())
        ->toBe(['label' => 'Production', 'color' => 'danger']);
});

it('resolves a closure per request and hides on null', function () {
    $label = 'Preview';
    $panel = (new PanelConfig)->environmentIndicator(function () use (&$label): ?array {
        return $label === null ? null : ['label' => $label];
    });
    inEnvironment('staging');

    expect($panel->getEnvironmentIndicator())->toBe(['label' => 'Preview', 'color' => 'warning']);

    $label = null;
    expect($panel->getEnvironmentIndicator())->toBeNull();
});

it('turns the indicator back off with false', function () {
    inEnvironment('staging');

    expect((new PanelConfig)->environmentIndicator()->environmentIndicator(false)->getEnvironmentIndicator())
        ->toBeNull();
});

it('rejects an override that is not keyed by environment', function () {
    (new PanelConfig)->environmentIndicator(['warning']);
})->throws(InvalidArgumentException::class, 'environmentIndicator()');

it('rejects an override array with unknown keys or non-string values', function (array $override) {
    (new PanelConfig)->environmentIndicator(['staging' => $override]);
})->with([
    'typo key' => [['colr' => 'danger']],
    'non-string label' => [['label' => 5]],
])->throws(InvalidArgumentException::class, 'label');

it('rejects a closure that returns an invalid indicator shape', function () {
    inEnvironment('staging');

    (new PanelConfig)->environmentIndicator(fn (): array => ['label' => 'QA', 'extra' => true])
        ->getEnvironmentIndicator();
})->throws(InvalidArgumentException::class, 'label');
