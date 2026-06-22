<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Support\Facades\URL;

/**
 * Builds a short-lived signed url to a page-scoped upload view route. The
 * signature binds the exact field + path, so it cannot be re-pointed at a
 * sibling file, and it expires — never persist the result, sign per render.
 */
final class SignedUploadUrl
{
    /** Time-to-live, in minutes, for a signed preview url. */
    public const TTL_MINUTES = 5;

    /**
     * @param  array<string, string>  $pageParams  page-level route params (e.g. {car}) the view route inherits
     */
    public static function make(string $routeName, string $fieldName, string $path, array $pageParams = []): string
    {
        return URL::temporarySignedRoute(
            $routeName,
            now()->addMinutes(self::TTL_MINUTES),
            // tbtopField/path spread last so they always win over a stale page param.
            [...$pageParams, 'tbtopField' => $fieldName, 'path' => $path],
        );
    }
}
