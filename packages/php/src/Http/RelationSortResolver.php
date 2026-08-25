<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Resolves a dot-path (e.g. "contact.company.name") into a correlated scalar
 * subquery ordering on the related column, mirroring FilamentPHP's
 * Column::applySort() relation-sort strategy: no JOIN, no aliasing.
 *
 * Each non-last segment must be a method on the current model returning an
 * Eloquent Relation; a many-cardinality relation (HasMany, BelongsToMany, …)
 * is capped with limit(1), so the sort sees the first related row only.
 *
 * The first segment not resolving to a relation method means the path isn't
 * a relation path at all (e.g. a JSON column access like "meta.title") —
 * callers fall back to a plain orderBy() in that case.
 */
final class RelationSortResolver
{
    /**
     * @return QueryBuilder|null Null when $path's first segment is not a
     *                           relation method on $builder's model.
     */
    public static function resolve(EloquentBuilder $builder, string $path): ?QueryBuilder
    {
        $segments = explode('.', $path);
        $column = array_pop($segments);
        if ($segments === []) {
            return null;
        }

        $relation = self::relationOf($builder->getModel(), $segments[0]);
        if ($relation === null) {
            return null;
        }

        return self::buildSubquery($relation, array_slice($segments, 1), $column, $builder);
    }

    /**
     * @param  list<string>  $remaining  Nested relation method names below the first segment, outermost first.
     */
    private static function buildSubquery(Relation $relation, array $remaining, string $column, EloquentBuilder $parentQuery): QueryBuilder
    {
        $innerQuery = $relation->getQuery();

        if ($remaining === []) {
            $sub = $relation->getRelationExistenceQuery($innerQuery, $parentQuery, [$column]);

            return $sub->limit(1)->getQuery();
        }

        $nextRelation = self::relationOf($relation->getRelated(), $remaining[0]);
        if ($nextRelation === null) {
            // A declared dot-path whose middle segment isn't a relation method
            // has no valid meaning — surface it rather than silently misordering.
            throw new \InvalidArgumentException(
                "Cannot sort by \"{$column}\": \"{$remaining[0]}\" is not a relation method on ".$relation->getRelated()::class.'.'
            );
        }

        $nested = self::buildSubquery($nextRelation, array_slice($remaining, 1), $column, $innerQuery);
        $sub = $relation->getRelationExistenceQuery($innerQuery, $parentQuery, [])
            ->selectSub($nested, $column);

        return $sub->limit(1)->getQuery();
    }

    private static function relationOf(Model $model, string $method): ?Relation
    {
        if (! method_exists($model, $method)) {
            return null;
        }

        $result = Relation::noConstraints(fn () => $model->{$method}());

        return $result instanceof Relation ? $result : null;
    }
}
