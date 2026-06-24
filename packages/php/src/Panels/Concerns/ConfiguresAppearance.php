<?php

namespace Tbtop\Admin\Panels\Concerns;

use InvalidArgumentException;

/**
 * Shell appearance knobs for PanelConfig that CSS alone can't express:
 * dark-mode policy and centered content width. Colors / radius / fonts are
 * deliberately NOT here — tbtop uses shadcn theme tokens, so you theme by
 * pasting a shadcn preset (:root / .dark blocks) into your app CSS. See
 * docs/ai/recipes.md → Theming.
 *
 * appearance() serializes only the keys an author changed from the default,
 * so an unconfigured panel ships nothing.
 */
trait ConfiguresAppearance
{
    /** Tailwind max-w tokens the shell can center page content to. */
    private const MAX_WIDTHS = [
        'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full', 'prose',
    ];

    private const THEME_MODES = ['light', 'dark', 'system'];

    private bool $darkMode = true;

    private string $defaultThemeMode = 'system';

    private ?string $maxContentWidth = null;

    /** Allow or disable the dark-mode toggle entirely (default: allowed). */
    public function darkMode(bool $enabled = true): static
    {
        $this->darkMode = $enabled;

        return $this;
    }

    /** Initial theme when the visitor has no saved preference. */
    public function defaultThemeMode(string $mode): static
    {
        if (! in_array($mode, self::THEME_MODES, true)) {
            throw new InvalidArgumentException("Unknown theme mode \"{$mode}\". Expected one of: ".implode(', ', self::THEME_MODES).'.');
        }
        $this->defaultThemeMode = $mode;

        return $this;
    }

    /** Center page content to a Tailwind max-w token (e.g. '7xl'). */
    public function maxContentWidth(string $width): static
    {
        if (! in_array($width, self::MAX_WIDTHS, true)) {
            throw new InvalidArgumentException("Unknown max content width \"{$width}\". Expected one of: ".implode(', ', self::MAX_WIDTHS).'.');
        }
        $this->maxContentWidth = $width;

        return $this;
    }

    /**
     * Sparse appearance payload for the client; omits keys left at defaults.
     * Returns [] when nothing was changed.
     *
     * @return array<string, mixed>
     */
    public function appearance(): array
    {
        return array_filter([
            'darkMode' => $this->darkMode === false ? false : null,
            'defaultTheme' => $this->defaultThemeMode !== 'system' ? $this->defaultThemeMode : null,
            'maxWidth' => $this->maxContentWidth,
        ], static fn (mixed $v): bool => $v !== null);
    }
}
