<?php

namespace Tbtop\Admin\Uploads;

use InvalidArgumentException;

/**
 * One `media.profiles` entry. Accepts the short `[maxW, maxH]` form or the
 * long `['width' => .., 'height' => .., 'format' => .., 'quality' => ..]` form;
 * format/quality fall back to `media.conversions`.
 */
final readonly class ConversionProfile
{
    public function __construct(
        public int $maxWidth,
        public int $maxHeight,
        public string $format,
        public ?int $quality,
    ) {
        if (! ImageEncoder::isKnownFormat($format)) {
            throw new InvalidArgumentException("Unknown conversion format '{$format}'.");
        }
    }

    /**
     * @param  array<string, mixed>  $mediaConfig  the `tbtop-admin.media` block
     * @return array<string, self>
     */
    public static function fromConfig(array $mediaConfig): array
    {
        $defaults = (array) ($mediaConfig['conversions'] ?? []);
        $defaultFormat = (string) ($defaults['format'] ?? 'webp');
        $defaultQuality = isset($defaults['quality']) ? (int) $defaults['quality'] : null;

        $out = [];
        foreach ((array) ($mediaConfig['profiles'] ?? []) as $name => $entry) {
            $out[(string) $name] = self::fromEntry((string) $name, $entry, $defaultFormat, $defaultQuality);
        }

        return $out;
    }

    private static function fromEntry(string $name, mixed $entry, string $defaultFormat, ?int $defaultQuality): self
    {
        if (! is_array($entry)) {
            throw new InvalidArgumentException("Media profile '{$name}' must be an array.");
        }
        $isShort = array_is_list($entry);
        $width = $isShort ? ($entry[0] ?? null) : ($entry['width'] ?? null);
        $height = $isShort ? ($entry[1] ?? null) : ($entry['height'] ?? null);
        if (! is_int($width) || ! is_int($height) || $width < 1 || $height < 1) {
            throw new InvalidArgumentException("Media profile '{$name}' needs positive integer width and height.");
        }
        $format = $isShort ? null : ($entry['format'] ?? null);
        $quality = $isShort ? null : ($entry['quality'] ?? null);

        return new self(
            $width,
            $height,
            is_string($format) ? $format : $defaultFormat,
            is_int($quality) ? $quality : $defaultQuality,
        );
    }
}
