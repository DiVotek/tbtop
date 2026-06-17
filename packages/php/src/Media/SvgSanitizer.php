<?php

namespace Tbtop\Admin\Media;

use enshrined\svgSanitize\Sanitizer;
use Illuminate\Support\Facades\Storage;

/**
 * Strips active content (scripts, event handlers, external refs) from stored
 * SVG files so admin-uploaded logos render inline without an XSS vector.
 * No-op for non-SVG mimes.
 */
final class SvgSanitizer
{
    /**
     * Sanitize an already-stored SVG in place. Runs after the file is written
     * to disk; overwrites the same path with the cleaned bytes.
     */
    public static function sanitizeStored(string $disk, string $path, string $mime): void
    {
        if (! self::isSvgMime($mime)) {
            return;
        }

        $storage = Storage::disk($disk);
        $dirty = (string) $storage->get($path);

        $clean = (new Sanitizer)->sanitize($dirty);
        if ($clean === false) {
            // Unparseable SVG: never leave dangerous bytes on disk.
            $storage->put($path, self::emptySvg());

            return;
        }

        $storage->put($path, $clean);
    }

    private static function isSvgMime(string $mime): bool
    {
        return str_starts_with($mime, 'image/svg+xml');
    }

    private static function emptySvg(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }
}
