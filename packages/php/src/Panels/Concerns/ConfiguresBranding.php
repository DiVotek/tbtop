<?php

namespace Tbtop\Admin\Panels\Concerns;

use InvalidArgumentException;

/**
 * Panel identity for PanelConfig: the brand name, a logo image that replaces it in
 * the chrome's logo block, and the browser-tab favicon. URLs are used as given —
 * pass `asset('…')` for a file in `public/`.
 */
trait ConfiguresBranding
{
    /** A CSS length in px, rem or em, e.g. '2rem' or '32px'. */
    private const LOGO_HEIGHT_PATTERN = '/^\d+(\.\d+)?(px|rem|em)$/';

    private ?string $brand = null;

    private ?string $brandLogo = null;

    private ?string $darkModeBrandLogo = null;

    private ?string $brandLogoHeight = null;

    private ?string $favicon = null;

    /** Brand name shown in the chrome (sidebar/topbar header); the logo's alt text when a logo is set. */
    public function brand(string $brand): static
    {
        $this->brand = $brand;

        return $this;
    }

    /** Logo image URL shown in the chrome's logo block instead of the brand name. */
    public function brandLogo(string $url): static
    {
        $this->brandLogo = self::requireUrl($url, 'brandLogo');

        return $this;
    }

    /** Logo image URL used while the panel is in dark mode; falls back to brandLogo(). */
    public function darkModeBrandLogo(string $url): static
    {
        $this->darkModeBrandLogo = self::requireUrl($url, 'darkModeBrandLogo');

        return $this;
    }

    /** Rendered logo height as a CSS length in px, rem or em (default '1.5rem'). */
    public function brandLogoHeight(string $height): static
    {
        if (preg_match(self::LOGO_HEIGHT_PATTERN, $height) !== 1) {
            throw new InvalidArgumentException("Invalid brand logo height \"{$height}\". Expected a px, rem or em length, e.g. '2rem'.");
        }
        $this->brandLogoHeight = $height;

        return $this;
    }

    /** Browser-tab icon URL (.ico, .png or .svg) for every page of the panel. */
    public function favicon(string $url): static
    {
        $this->favicon = self::requireUrl($url, 'favicon');

        return $this;
    }

    public function getBrand(): ?string
    {
        return $this->brand;
    }

    /**
     * Sparse logo payload for the client, or null while no brandLogo() is set
     * (a dark-mode logo alone does not replace the brand name).
     *
     * @return array{src: string, darkSrc?: string, height?: string}|null
     */
    public function getBrandLogo(): ?array
    {
        if ($this->brandLogo === null) {
            return null;
        }

        return array_filter([
            'src' => $this->brandLogo,
            'darkSrc' => $this->darkModeBrandLogo,
            'height' => $this->brandLogoHeight,
        ], static fn (?string $v): bool => $v !== null);
    }

    public function getFavicon(): ?string
    {
        return $this->favicon;
    }

    private static function requireUrl(string $url, string $method): string
    {
        if (trim($url) === '') {
            throw new InvalidArgumentException("{$method}() needs a non-empty URL.");
        }

        return $url;
    }
}
