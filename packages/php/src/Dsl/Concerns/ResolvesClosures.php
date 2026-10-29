<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Color;

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

    /**
     * The setter's signature type-checks a literal but not a Closure's result;
     * wrap the Closure so a wrong type throws on resolve instead of reaching the wire.
     *
     * @template T
     *
     * @param  T  $value
     * @param  'int'|'number'|'string'|'?string'|'color'  $type
     * @return T
     */
    protected static function typedDeferral(mixed $value, string $type, string $setter): mixed
    {
        if (! $value instanceof Closure) {
            return $value;
        }

        return static function () use ($value, $type, $setter): mixed {
            $resolved = $value();
            $isValid = match ($type) {
                'int' => is_int($resolved),
                'number' => is_int($resolved) || is_float($resolved),
                'string' => is_string($resolved),
                '?string' => $resolved === null || is_string($resolved),
                'color' => is_string($resolved) || $resolved instanceof Color,
            };
            if (! $isValid) {
                throw new InvalidArgumentException("{$setter}() Closure must return {$type}, got ".get_debug_type($resolved).'.');
            }

            return $resolved;
        };
    }
}
