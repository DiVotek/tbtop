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

it('omits the style preset while it holds its default', function () {
    expect((new PanelConfig)->appearance())->toBe([])
        ->and((new PanelConfig)->getStylePresetClass())->toBe('style-preset-vega');
});

it('serializes a chosen style preset and its html scope class', function () {
    $panel = (new PanelConfig)->stylePreset('lyra');

    expect($panel->appearance())->toBe(['stylePreset' => 'lyra'])
        ->and($panel->getStylePresetClass())->toBe('style-preset-lyra');
});

it('rejects an unknown style preset', function () {
    (new PanelConfig)->stylePreset('new-york');
})->throws(InvalidArgumentException::class, 'Unknown style preset');

it('has no brand logo or favicon until configured', function () {
    $panel = new PanelConfig;

    expect($panel->getBrandLogo())->toBeNull()
        ->and($panel->getFavicon())->toBeNull();
});

it('serializes the brand logo with only the keys an author set', function () {
    expect((new PanelConfig)->brandLogo('/img/logo.svg')->getBrandLogo())
        ->toBe(['src' => '/img/logo.svg']);

    $logo = (new PanelConfig)
        ->brandLogo('/img/logo.svg')
        ->darkModeBrandLogo('/img/logo-dark.svg')
        ->brandLogoHeight('2.5rem')
        ->getBrandLogo();

    expect($logo)->toBe(['src' => '/img/logo.svg', 'darkSrc' => '/img/logo-dark.svg', 'height' => '2.5rem']);
});

it('keeps the brand name when only a dark-mode logo is set', function () {
    expect((new PanelConfig)->darkModeBrandLogo('/img/logo-dark.svg')->getBrandLogo())->toBeNull();
});

it('rejects a brand logo height that is not a px, rem or em length', function (string $height) {
    (new PanelConfig)->brandLogoHeight($height);
})->with(['2', 'auto', '10%', '1rem; color: red', "2rem\n"])->throws(InvalidArgumentException::class, 'Invalid brand logo height');

it('rejects an empty logo or favicon URL', function (string $method) {
    (new PanelConfig)->{$method}('  ');
})->with(['brandLogo', 'darkModeBrandLogo', 'favicon'])->throws(InvalidArgumentException::class, 'needs a non-empty URL');

it('keeps the favicon URL as given', function () {
    expect((new PanelConfig)->favicon('https://cdn.example.com/favicon.svg')->getFavicon())
        ->toBe('https://cdn.example.com/favicon.svg');
});
