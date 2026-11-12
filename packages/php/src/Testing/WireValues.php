<?php

namespace Tbtop\Admin\Testing;

use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

/**
 * Form values as the client posts them: JSON scalars. Lets a test fill a form
 * straight from a model or factory — `Post::factory()->make()->only([...])` —
 * whose casts hand back enums, dates and related models.
 *
 * @internal
 */
final class WireValues
{
    public static function of(mixed $value): mixed
    {
        return match (true) {
            is_array($value) => array_map(self::of(...), $value),
            $value instanceof BackedEnum => $value->value,
            $value instanceof UnitEnum => $value->name,
            // ISO 8601 with the value's own offset, so a date cast read in the
            // app timezone stays on the same day when the server parses it.
            $value instanceof DateTimeInterface => $value->format('Y-m-d\TH:i:sP'),
            $value instanceof Model => $value->getKey(),
            default => $value,
        };
    }
}
