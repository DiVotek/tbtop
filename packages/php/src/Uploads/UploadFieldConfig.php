<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Dsl\Fields\Upload;

/**
 * Resolved upload settings for one Upload field: config preset merged
 * under the field's inline DSL options (inline wins on key collision).
 */
final class UploadFieldConfig
{
    private const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

    /**
     * @param  list<string>  $accept
     * @param  array{convertTo: string, quality?: int}|null  $image
     * @param  array<string, array{0: int, 1: int}>  $sizes
     */
    public function __construct(
        public readonly string $disk,
        public readonly string $directory,
        public readonly string $visibility,
        public readonly int $maxSize,
        public readonly array $accept,
        public readonly ?array $image,
        public readonly array $sizes,
    ) {}

    public static function resolve(Upload $field): self
    {
        $options = $field->toNode()->options;
        // Inline options (left) win over the preset base (right) on key collision.
        $merged = $options + self::preset($options);

        return new self(
            disk: (string) ($merged['disk'] ?? 'public'),
            directory: (string) ($merged['directory'] ?? 'uploads'),
            visibility: (string) ($merged['visibility'] ?? 'public'),
            maxSize: (int) ($merged['maxSize'] ?? self::DEFAULT_MAX_SIZE),
            accept: self::normalizeAccept($merged['accept'] ?? []),
            image: self::normalizeImage($merged['image'] ?? null),
            sizes: self::normalizeSizes($merged['sizes'] ?? []),
        );
    }

    /** Validates the upload mime against the accept allowlist (empty = allow all). */
    public function assertMime(UploadedFile $file): void
    {
        if ($this->accept === []) {
            return;
        }
        $mime = (string) $file->getMimeType();
        foreach ($this->accept as $pattern) {
            if (fnmatch($pattern, $mime)) {
                return;
            }
        }
        abort(422, "File type {$mime} is not allowed.");
    }

    /**
     * Base preset from config, keyed by the field's `entity` or `profile` option.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private static function preset(array $options): array
    {
        $key = $options['entity'] ?? $options['profile'] ?? null;
        if (! is_string($key)) {
            return [];
        }
        $presets = config('tbtop-admin.uploads', []);
        $preset = is_array($presets) ? ($presets[$key] ?? null) : null;

        return is_array($preset) ? $preset : [];
    }

    /**
     * A string accept ('image/*') normalizes to a single-element list.
     *
     * @return list<string>
     */
    private static function normalizeAccept(mixed $accept): array
    {
        if (is_string($accept)) {
            return $accept === '' ? [] : [$accept];
        }

        return is_array($accept) ? array_values(array_map('strval', $accept)) : [];
    }

    /**
     * Conversion is opt-in: null unless a target format is set.
     *
     * @return array{convertTo: string, quality?: int}|null
     */
    private static function normalizeImage(mixed $image): ?array
    {
        if (! is_array($image) || ! isset($image['convertTo']) || ! is_string($image['convertTo'])) {
            return null;
        }
        $out = ['convertTo' => $image['convertTo']];
        if (isset($image['quality'])) {
            $out['quality'] = (int) $image['quality'];
        }

        return $out;
    }

    /**
     * @return array<string, array{0: int, 1: int}>
     */
    private static function normalizeSizes(mixed $sizes): array
    {
        return is_array($sizes) ? $sizes : [];
    }
}
