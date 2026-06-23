<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Dsl\Fields\Upload;

/**
 * The one place that turns a stored upload path into a browser url. Public
 * files link straight to their disk url; private files get a fresh short-lived
 * signed url to the page-scoped streaming route (a private file has no
 * publicly servable url). Called both after upload and on every render.
 */
final class UploadFieldUrl
{
    /**
     * Choose the url for a single stored path.
     *
     * @param  array<string, string>  $pageParams  page route params the view route inherits
     */
    public static function for(
        UploadFieldConfig $config,
        string $field,
        string $path,
        ?string $viewRouteName,
        array $pageParams = [],
    ): string {
        if ($config->visibility === 'private' && $viewRouteName !== null && Route::has($viewRouteName)) {
            return SignedUploadUrl::make($viewRouteName, $field, $path, $pageParams);
        }

        return UploadUrl::make($config->disk, $path);
    }

    /**
     * Rewrite each upload field's stored `path` into a `url` on the record.
     * Single string values normalize into a `{path, url, filename}` envelope;
     * multiple fields normalize string elements the same way. Null and other
     * shapes pass through.
     *
     * @param  array<string, mixed>  $record
     * @param  list<Upload>  $fields
     * @param  array<string, string>  $pageParams  page route params the view route inherits
     * @return array<string, mixed>
     */
    public static function applyToRecord(array $record, array $fields, ?string $pageRouteName, array $pageParams = []): array
    {
        $viewRoute = $pageRouteName === null ? null : $pageRouteName.'.uploadView';
        foreach ($fields as $field) {
            $value = $record[$field->name] ?? null;
            $config = UploadFieldConfig::resolve($field);
            if (is_array($value) && isset($value['path']) && is_string($value['path'])) {
                $value['url'] = self::for($config, $field->name, $value['path'], $viewRoute, $pageParams);
                $record[$field->name] = $value;
            } elseif (! $field->isMultiple() && is_string($value)) {
                $record[$field->name] = self::normalizeStringValue($value, $config, $field->name, $viewRoute, $pageParams);
            } elseif ($field->isMultiple() && is_array($value)) {
                $record[$field->name] = self::normalizeElements($value, $config, $field->name, $viewRoute, $pageParams);
            }
        }

        return $record;
    }

    /**
     * Normalize one string upload value into the `{path, url, filename}` envelope.
     * Absolute urls / leading-slash paths are used as-is; relative disk paths go
     * through disk resolution.
     *
     * @param  array<string, string>  $pageParams
     * @return array{path: string, url: string, filename: string}
     */
    private static function normalizeStringValue(
        string $value,
        UploadFieldConfig $config,
        string $field,
        ?string $viewRoute,
        array $pageParams
    ): array {
        $isAbsolute = str_starts_with($value, 'http://')
            || str_starts_with($value, 'https://')
            || str_starts_with($value, '/');
        $url = $isAbsolute ? $value : self::for($config, $field, $value, $viewRoute, $pageParams);

        return ['path' => $value, 'url' => $url, 'filename' => basename($value)];
    }

    /**
     * Map a multiple field's elements: normalize strings, pass other shapes through.
     *
     * @param  list<mixed>  $values
     * @param  array<string, string>  $pageParams
     * @return list<mixed>
     */
    private static function normalizeElements(
        array $values,
        UploadFieldConfig $config,
        string $field,
        ?string $viewRoute,
        array $pageParams
    ): array {
        return array_map(
            fn (mixed $element): mixed => is_string($element)
                ? self::normalizeStringValue($element, $config, $field, $viewRoute, $pageParams)
                : $element,
            $values,
        );
    }
}
