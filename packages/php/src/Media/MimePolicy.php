<?php

namespace Tbtop\Admin\Media;

/** Shared ingestion allowlist. Callers own the rejection response. */
final class MimePolicy
{
    /**
     * @param  list<string>  $accept  fnmatch patterns; an empty list allows everything
     */
    public static function allows(string $mime, array $accept): bool
    {
        // HTML and the XML family are active content: a browser runs script in
        // text/xml or application/xhtml+xml served from the public disk. Refuse
        // them even when the accept list allows text/* or is empty. SVG is the
        // one XML type let through — SvgSanitizer strips its scripts on store.
        if (self::isActiveMarkup($mime)) {
            return false;
        }

        if ($accept === []) {
            return true;
        }

        foreach ($accept as $pattern) {
            if (fnmatch((string) $pattern, $mime)) {
                return true;
            }
        }

        return false;
    }

    private static function isActiveMarkup(string $mime): bool
    {
        $type = self::fromHeader($mime);
        if ($type === 'image/svg+xml') {
            return false;
        }

        return in_array($type, ['text/html', 'text/xml', 'text/xsl', 'application/xml', 'application/xhtml+xml'], true)
            || str_ends_with($type, '+xml');
    }

    /**
     * The bare type from a Content-Type header, lowercased and without
     * parameters ("image/png; charset=binary" → "image/png").
     */
    public static function fromHeader(string $header): string
    {
        $parts = explode(';', $header, 2);

        return trim(strtolower($parts[0]));
    }
}
