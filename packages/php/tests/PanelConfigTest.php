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
