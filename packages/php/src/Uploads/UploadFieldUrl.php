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
    /** Choose the url for a single stored path. */
    public static function for(
        UploadFieldConfig $config,
        string $field,
        string $path,
        ?string $viewRouteName,
    ): string {
        if ($config->visibility === 'private' && $viewRouteName !== null && Route::has($viewRouteName)) {
            return SignedUploadUrl::make($viewRouteName, $field, $path);
        }

        return UploadUrl::make($config->disk, $path);
    }

    /**
     * Rewrite each upload field's stored `path` into a `url` on the record.
     * Values without a `path` (legacy url-shaped, or null) pass through.
     *
     * @param  array<string, mixed>  $record
     * @param  list<Upload>  $fields
     * @return array<string, mixed>
     */
    public static function applyToRecord(array $record, array $fields, ?string $pageRouteName): array
    {
        $viewRoute = $pageRouteName === null ? null : $pageRouteName.'.uploadView';
        foreach ($fields as $field) {
            $value = $record[$field->name] ?? null;
            if (! is_array($value) || ! isset($value['path']) || ! is_string($value['path'])) {
                continue;
            }
            $config = UploadFieldConfig::resolve($field);
            $value['url'] = self::for($config, $field->name, $value['path'], $viewRoute);
            $record[$field->name] = $value;
        }

        return $record;
    }
}
