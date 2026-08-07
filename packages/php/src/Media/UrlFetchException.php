<?php

namespace Tbtop\Admin\Media;

use RuntimeException;

/** Why a URL import was refused. Callers map the reason to their own response. */
final class UrlFetchException extends RuntimeException
{
    public const BLOCKED_URL = 'blocked_url';

    public const DOWNLOAD_FAILED = 'download_failed';

    public const FILE_TOO_LARGE = 'file_too_large';

    public const MIME_NOT_ALLOWED = 'mime_not_allowed';

    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
