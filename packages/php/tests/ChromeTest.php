<?php

use Tbtop\Admin\Panels\Chrome;
use Tbtop\Admin\Panels\ChromeSerializer;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Chromes\FooterChrome;
use Tbtop\Admin\Tests\Fixtures\Chromes\HeaderActionChrome;
use Tbtop\Admin\Tests\Fixtures\Chromes\ServerActionChrome;

function panelWithChrome(?string $chrome): CurrentPanel
{
    $config = (new PanelConfig)->id('admin')->prefix('admin');
    if ($chrome !== null) {
        $config->chrome($chrome);
    }

    return new CurrentPanel($config);
}

/** @return list<string> */
function childKinds(stdClass $area): array
{
    return array_map(fn (stdClass $child): string => $child->kind, $area->options->children);
}

it('serializes the default chrome: logo + navMenu sidebar, userMenu header, no footer', function () {
    $chrome = ChromeSerializer::forPanel(panelWithChrome(null));

    expect($chrome['sidebar']->kind)->toBe('stack')
        ->and(childKinds($chrome['sidebar']))->toBe(['logo', 'navMenu'])
        ->and($chrome['header']->kind)->toBe('row')
        ->and(childKinds($chrome['header']))->toBe(['userMenu'])
        ->and($chrome['footer'])->toBeNull();
});

it('falls back to the package default when the panel sets no chrome class', function () {
    $explicit = ChromeSerializer::forPanel(panelWithChrome(Chrome::class));
    $fallback = ChromeSerializer::forPanel(panelWithChrome(null));

    expect(json_encode($fallback))->toBe(json_encode($explicit));
});

it('a chrome override appends its extra node after the default header items', function () {
    $chrome = ChromeSerializer::forPanel(panelWithChrome(HeaderActionChrome::class));

    expect(childKinds($chrome['header']))->toBe(['userMenu', 'action'])
        ->and($chrome['header']->options->children[1]->options->spec->type)->toBe('visit');
});

it('a chrome override can add a footer tree', function () {
    $chrome = ChromeSerializer::forPanel(panelWithChrome(FooterChrome::class));

    expect($chrome['footer']->kind)->toBe('row')
        ->and(childKinds($chrome['footer']))->toBe(['displayText']);
});

it('rejects a server-closure action inside a chrome tree', function () {
    ChromeSerializer::forPanel(panelWithChrome(ServerActionChrome::class));
})->throws(LogicException::class, 'page-independent');

it('rejects a chrome class that does not extend the Chrome base', function () {
    ChromeSerializer::forPanel(panelWithChrome(stdClass::class));
})->throws(LogicException::class, 'must extend');
