<?php

use Tbtop\Admin\CommandPalette\Command;
use Tbtop\Admin\CommandPalette\CommandPaletteConfig;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

it('serializes a command with only its label by default', function () {
    expect(Command::make('Posts')->toArray())->toBe(['label' => 'Posts']);
});

it('includes href, icon, group, newTab and keywords when set', function () {
    $command = Command::make('Docs')
        ->url('https://example.test')
        ->icon('globe')
        ->group('Links')
        ->openInNewTab()
        ->keywords(['help', 'guide']);

    expect($command->toArray())->toBe([
        'label' => 'Docs',
        'href' => 'https://example.test',
        'icon' => ['name' => 'globe', 'position' => 'left'],
        'group' => 'Links',
        'newTab' => true,
        'keywords' => ['help', 'guide'],
    ]);
});

it('serializes a handler command without an href', function () {
    expect(Command::make('Toggle theme')->handler('toggleTheme')->toArray())
        ->toBe(['label' => 'Toggle theme', 'handler' => 'toggleTheme']);
});

it('emits an empty options array for a default-on palette', function () {
    expect((new CommandPaletteConfig)->toArray())->toBe([]);
});

it('omits the hotkey while it holds the default', function () {
    expect((new CommandPaletteConfig)->hotkey('mod+k')->toArray())->toBe([]);
});

it('serializes only the options changed from their defaults', function () {
    $palette = (new CommandPaletteConfig)
        ->placeholder('Find…')
        ->hotkey('mod+/')
        ->includeNav(false)
        ->commands([Command::make('Posts')->url('/admin/posts')]);

    expect($palette->toArray())->toBe([
        'placeholder' => 'Find…',
        'hotkey' => 'mod+/',
        'includeNav' => false,
        'commands' => [['label' => 'Posts', 'href' => '/admin/posts']],
    ]);
});

it('enables the palette by default on a panel', function () {
    expect((new PanelConfig)->getCommandPalette()->isEnabled())->toBeTrue();
});

it('disables the palette via commandPalette(false)', function () {
    expect((new PanelConfig)->commandPalette(false)->getCommandPalette()->isEnabled())->toBeFalse();
});

it('configures the palette through a closure', function () {
    $config = (new PanelConfig)->commandPalette(
        fn (CommandPaletteConfig $p) => $p->placeholder('Jump to…')->includeNav(false)
    );

    expect($config->getCommandPalette()->toArray())
        ->toBe(['placeholder' => 'Jump to…', 'includeNav' => false]);
});

it('re-enables a previously disabled palette', function () {
    $config = (new PanelConfig)->commandPalette(false)->commandPalette(true);

    expect($config->getCommandPalette()->isEnabled())->toBeTrue();
});

it('exposes sparse options through the current panel when enabled', function () {
    expect((new CurrentPanel(new PanelConfig))->commandPalette())->toBe([]);
});

it('returns null through the current panel when disabled', function () {
    expect((new CurrentPanel((new PanelConfig)->commandPalette(false)))->commandPalette())->toBeNull();
});
