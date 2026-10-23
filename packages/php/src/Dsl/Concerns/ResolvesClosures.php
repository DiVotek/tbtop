<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

/**
 * Deferred-value resolution for `T|Closure(): T` option values. Resolve at
 * read time (toNode() / a reader), never in the setter — that's the deferral.
 */
trait ResolvesClosures
{
    protected function resolveOpt(mixed $value): mixed
    {
        return $value instanceof Closure ? $value() : $value;
    }
}
