<?php

namespace Tbtop\Admin\Dsl;

use DateTimeInterface;
use Illuminate\Support\Carbon;
use Tbtop\Admin\Dsl\Fields\Date;
use Throwable;

/**
 * Wire contract: a date field's value is a Y-m-d day. Eloquent serializes a
 * date or datetime cast as an ISO instant (2026-10-15T09:00:00.000000Z), and
 * the client's date input reads only a bare day, so record($model->toArray())
 * would render an empty field and a save would wipe the stored date.
 *
 * The instant is read in the app timezone before the day is taken: a `date`
 * cast at local midnight east of UTC serializes as the previous day in UTC.
 */
final class DateRecord
{
    private const string INSTANT = '/^\d{4}-\d{2}-\d{2}[T ]/';

    /**
     * @param  array<string, mixed>  $record
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function normalize(array $record, array $children): array
    {
        foreach (self::dateNames($children) as $name) {
            if (! array_key_exists($name, $record)) {
                continue;
            }
            $record[$name] = self::toDay($record[$name]);
        }

        return $record;
    }

    /**
     * Node containers only, as in TranslatableRecord: a repeater's sub-fields
     * live at record['items'][n], never at the top-level key normalized here.
     *
     * @param  list<mixed>  $children
     * @return list<string>
     */
    private static function dateNames(array $children): array
    {
        $names = [];
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof Date) {
                $names[] = $child->name;
            } elseif ($child instanceof Node) {
                $names = [...$names, ...self::dateNames(StructureWalk::descendants($child))];
            }
        }

        return $names;
    }

    /** Anything that is not a recognisable instant passes through for validation to judge. */
    private static function toDay(mixed $value): mixed
    {
        if ($value instanceof DateTimeInterface) {
            return self::localDay(Carbon::instance($value));
        }
        if (! is_string($value) || preg_match(self::INSTANT, $value) !== 1) {
            return $value;
        }
        try {
            return self::localDay(Carbon::parse($value));
        } catch (Throwable) {
            return $value;
        }
    }

    private static function localDay(Carbon $instant): string
    {
        return $instant->setTimezone(date_default_timezone_get())->format('Y-m-d');
    }
}
