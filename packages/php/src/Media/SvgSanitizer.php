<?php

namespace Tbtop\Admin\Media;

use enshrined\svgSanitize\Sanitizer;
use Illuminate\Support\Facades\Storage;

/**
 * Strips active content (scripts, event handlers, external refs) from stored
 * SVG files so admin-uploaded logos render inline without an XSS vector.
 *
 * SVG is detected from the stored bytes + filename, never from the
 * browser-reported mime alone: finfo classifies a scriptful SVG wrapped in an
 * HTML comment or shell as text/html, which would otherwise skip sanitization
 * and ship the raw bytes to the public disk (stored XSS).
 */
final class SvgSanitizer
{
    /**
     * Sanitize an already-stored SVG in place. Runs after the file is written
     * to disk; overwrites the same path with the cleaned bytes. No-op when the
     * bytes are not SVG.
     */
    public static function sanitizeStored(string $disk, string $path, ?string $originalName = null): void
    {
        $storage = Storage::disk($disk);
        $dirty = (string) $storage->get($path);

        if (! self::looksLikeSvg($dirty, $path, $originalName)) {
            return;
        }

        $clean = (new Sanitizer)->sanitize($dirty);
        if ($clean === false) {
            // Unparseable SVG: never leave dangerous bytes on disk.
            $storage->put($path, self::emptySvg());

            return;
        }

        $storage->put($path, $clean);
    }

    /**
     * SVG if a text payload carries an `<svg` root, or the stored/original
     * filename is an SVG extension — independent of the claimed mime. The NUL
     * check avoids treating a binary image that incidentally contains the
     * bytes "<svg" as SVG (which would fail-parse and be emptied).
     */
    private static function looksLikeSvg(string $content, string $path, ?string $originalName): bool
    {
        $isText = ! str_contains($content, "\0");
        if ($isText && stripos($content, '<svg') !== false) {
            return true;
        }

        return self::hasSvgExtension($path) || self::hasSvgExtension((string) $originalName);
    }

    private static function hasSvgExtension(string $name): bool
    {
        $ext = strtolower((string) pathinfo($name, PATHINFO_EXTENSION));

        return $ext === 'svg' || $ext === 'svgz';
    }

    private static function emptySvg(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }
}
