<?php

namespace Tbtop\Admin\Dsl;

final class RelationSearchLimit
{
    public const DEFAULT_RESULTS = 50;

    /**
     * Field override, then config, then the default. Anything non-positive
     * falls back — a published env()-backed config yields null, and a zero
     * limit would truncate the search to nothing.
     */
    public static function resolve(?int $fieldLimit = null): int
    {
        if ($fieldLimit !== null) {
            return $fieldLimit > 0 ? $fieldLimit : self::DEFAULT_RESULTS;
        }

        $configured = (int) config('tbtop-admin.relation.search_cap');

        return $configured > 0 ? $configured : self::DEFAULT_RESULTS;
    }
}
