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
     *
     * The underlying sanitizer returns `false` identically for a broken SVG, a
     * gzip-compressed valid SVG (.svgz), and an unrelated binary format — parse
     * failure alone cannot tell them apart. A raster file uploaded under a
     * `.svg` name is recovered by checking the bytes for a known binary
     * signature and left untouched; anything else that fails to parse is
     * refused and the file removed, since a false negative here means shipping
     * unsanitized (possibly scriptful) bytes to the public disk.
     *
     * @throws SvgSanitizeException when the bytes look like SVG but do not
     *                              parse and are not a recognized raster format
     */
    public static function sanitizeStored(string $disk, string $path, ?string $originalName = null): void
    {
        $storage = Storage::disk($disk);
        $dirty = (string) $storage->get($path);

        if (! self::looksLikeSvg($dirty, $path, $originalName)) {
            return;
        }

        $clean = (new Sanitizer)->sanitize($dirty);
        if ($clean !== false) {
            $storage->put($path, $clean);

            return;
        }

        if (self::hasRasterSignature($dirty) && ! self::hasSvgzExtension($path, $originalName)) {
            return;
        }

        $storage->delete($path);
        throw new SvgSanitizeException(SvgSanitizeException::INVALID);
    }

    /**
     * SVG if a text payload carries an `<svg` root, or the stored/original
     * filename is an SVG extension — independent of the claimed mime. The NUL
     * check avoids treating a binary image that incidentally contains the
     * bytes "<svg" as SVG; that route into this method still goes through the
     * raster-signature check below before anything is rejected.
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

    private static function hasSvgzExtension(string $path, ?string $originalName): bool
    {
        $ext = static fn (string $name): string => strtolower((string) pathinfo($name, PATHINFO_EXTENSION));

        return $ext($path) === 'svgz' || $ext((string) $originalName) === 'svgz';
    }

    /**
     * Positive signature check for common raster/container formats. Used only
     * to recover a mis-extensioned raster upload (e.g. a PNG saved as
     * `photo.svg`) that fails SVG parsing for the unremarkable reason that it
     * is not SVG at all — never to broaden what counts as safe to keep.
     */
    private static function hasRasterSignature(string $content): bool
    {
        if (str_starts_with($content, "\x89PNG\r\n\x1a\n")) {
            return true;
        }
        if (str_starts_with($content, "\xFF\xD8\xFF")) {
            return true;
        }
        if (str_starts_with($content, 'GIF87a') || str_starts_with($content, 'GIF89a')) {
            return true;
        }
        if (str_starts_with($content, 'RIFF') && substr($content, 8, 4) === 'WEBP') {
            return true;
        }

        return str_starts_with($content, 'BM');
    }
}
