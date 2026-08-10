<?php

namespace Tbtop\Admin\Media;

use RuntimeException;

/** Thrown when a stored file claims to be SVG but does not sanitize. Callers map the reason to their own response. */
final class SvgSanitizeException extends RuntimeException
{
    public const INVALID = 'svg_invalid';

    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
