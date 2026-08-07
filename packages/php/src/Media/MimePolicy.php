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
        // text/html is active content (the SVG-as-html XSS vector). Refuse it
        // even when the accept list allows text/* — it is never a media file.
        if (str_starts_with($mime, 'text/html')) {
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
