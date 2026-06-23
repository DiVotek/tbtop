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
     * Rewrite each upload field's stored path into a `{path, url}` shape.
     * Null values pass through; string paths become objects; arrays of string
     * paths become arrays of objects.
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
            $record[$field->name] = self::normalizeValue($value, $field, $config, $viewRoute, $pageParams);
        }

        return $record;
    }

    /**
     * @param  array<string, string>  $pageParams
     */
    private static function normalizeValue(mixed $value, Upload $field, UploadFieldConfig $config, ?string $viewRoute, array $pageParams): mixed
    {
        if ($field->isTranslatableField() && is_array($value) && ! self::isEnvelope($value)) {
            $out = [];
            foreach ($value as $locale => $localeValue) {
                $out[(string) $locale] = self::normalizeUploadValue($localeValue, $field->isMultiple(), $config, $field->name, $viewRoute, $pageParams);
            }

            return $out;
        }

        return self::normalizeUploadValue($value, $field->isMultiple(), $config, $field->name, $viewRoute, $pageParams);
    }

    /**
     * @param  array<string, string>  $pageParams
     */
    private static function normalizeUploadValue(mixed $value, bool $multiple, UploadFieldConfig $config, string $fieldName, ?string $viewRoute, array $pageParams): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            return self::envelope($value, $config, $fieldName, $viewRoute, $pageParams);
        }

        if (is_array($value) && self::isEnvelope($value)) {
            return self::envelope($value['path'], $config, $fieldName, $viewRoute, $pageParams);
        }

        if ($multiple && is_array($value)) {
            return array_values(array_filter(array_map(
                static fn (mixed $item): ?array => self::normalizeUploadItem($item, $config, $fieldName, $viewRoute, $pageParams),
                $value,
            )));
        }

        return $value;
    }

    /**
     * @param  array<string, string>  $pageParams
     * @return array{path: string, url: string}|null
     */
    private static function normalizeUploadItem(mixed $item, UploadFieldConfig $config, string $fieldName, ?string $viewRoute, array $pageParams): ?array
    {
        if (is_string($item)) {
            return self::envelope($item, $config, $fieldName, $viewRoute, $pageParams);
        }

        if (is_array($item) && self::isEnvelope($item)) {
            return self::envelope($item['path'], $config, $fieldName, $viewRoute, $pageParams);
        }

        return null;
    }

    /** @param  array<mixed>  $value */
    private static function isEnvelope(array $value): bool
    {
        return isset($value['path']) && is_string($value['path']);
    }

    /**
     * @param  array<string, string>  $pageParams
     * @return array{path: string, url: string}
     */
    private static function envelope(string $path, UploadFieldConfig $config, string $fieldName, ?string $viewRoute, array $pageParams): array
    {
        return [
            'path' => $path,
            'url' => self::for($config, $fieldName, $path, $viewRoute, $pageParams),
        ];
    }
}
