<?php

namespace Tbtop\Admin\Media;

use RuntimeException;

/**
 * Why a media ingest was refused. The reason is a suffix of the
 * `tbtop-admin::admin.media.errors.*` lang keys, plus STORE_FAILED which has no
 * user-facing copy. Callers map it to their own response.
 */
final class MediaIngestException extends RuntimeException
{
    public const MIME_NOT_ALLOWED = UrlFetchException::MIME_NOT_ALLOWED;

    public const DOWNLOAD_FAILED = UrlFetchException::DOWNLOAD_FAILED;

    public const STORE_FAILED = 'store_failed';

    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
