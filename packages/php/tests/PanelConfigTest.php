<?php

use Tbtop\Admin\Panels\PanelConfig;

it('defaults navigation to the sidebar layout', function () {
    expect((new PanelConfig)->getNavigation())->toBe('sidebar');
});

it('accepts the topbar navigation layout', function () {
    expect((new PanelConfig)->navigation('topbar')->getNavigation())->toBe('topbar');
});

it('rejects an unknown navigation layout', function () {
    (new PanelConfig)->navigation('floating');
})->throws(InvalidArgumentException::class, 'Unknown navigation');

it('omits appearance when nothing is configured', function () {
    expect((new PanelConfig)->appearance())->toBe([]);
});

it('serializes only the appearance keys changed from their defaults', function () {
    $appearance = (new PanelConfig)
        ->darkMode(false)
        ->defaultThemeMode('dark')
        ->maxContentWidth('7xl')
        ->appearance();

    expect($appearance)->toBe([
        'darkMode' => false,
        'defaultTheme' => 'dark',
        'maxWidth' => '7xl',
    ]);
});

it('omits darkMode and defaultTheme while they hold their defaults', function () {
    expect((new PanelConfig)->maxContentWidth('lg')->appearance())
        ->toBe(['maxWidth' => 'lg']);
});

it('rejects an unknown max content width', function () {
    (new PanelConfig)->maxContentWidth('8xl');
})->throws(InvalidArgumentException::class, 'Unknown max content width');

it('rejects an unknown default theme mode', function () {
    (new PanelConfig)->defaultThemeMode('sepia');
})->throws(InvalidArgumentException::class, 'Unknown theme mode');

it('omits density while it holds its default', function () {
    expect((new PanelConfig)->appearance())->toBe([]);
});

it('serializes density when set to compact', function () {
    expect((new PanelConfig)->density('compact')->appearance())
        ->toBe(['density' => 'compact']);
});

it('rejects an unknown density', function () {
    (new PanelConfig)->density('cozy');
})->throws(InvalidArgumentException::class, 'Unknown density');
