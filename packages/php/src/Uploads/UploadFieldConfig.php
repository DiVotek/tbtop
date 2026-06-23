<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Dsl\Fields\Upload;

/**
 * Resolved upload settings for one Upload field: inline DSL options only.
 */
final class UploadFieldConfig
{
    private const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

    /**
     * @param  list<string>  $accept
     * @param  array{convertTo: string, quality?: int}|null  $image
     */
    public function __construct(
        public readonly string $disk,
        public readonly string $directory,
        public readonly string $visibility,
        public readonly int $maxSize,
        public readonly array $accept,
        public readonly ?array $image,
    ) {}

    public static function resolve(Upload $field): self
    {
        $options = $field->toNode()->options;

        return new self(
            disk: (string) ($options['disk'] ?? 'public'),
            directory: (string) ($options['directory'] ?? 'uploads'),
            visibility: (string) ($options['visibility'] ?? 'public'),
            maxSize: (int) ($options['maxSize'] ?? self::DEFAULT_MAX_SIZE),
            accept: self::normalizeAccept($options['accept'] ?? []),
            image: self::normalizeImage($options['image'] ?? null),
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
     * A string accept normalizes to a list, splitting on commas
     * ('application/pdf,image/*' → two patterns). Arrays pass through.
     *
     * @return list<string>
     */
    private static function normalizeAccept(mixed $accept): array
    {
        if (is_string($accept)) {
            return array_values(array_filter(array_map('trim', explode(',', $accept))));
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
}
