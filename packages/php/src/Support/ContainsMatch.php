<?php

declare(strict_types=1);

namespace Tbtop\Admin\Support;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Builder as ConcreteEloquentBuilder;

/**
 * Substring match with `%` and `_` in the term taken literally.
 * Escape char is `!`: `ESCAPE '\'` is a syntax error on MySQL.
 *
 * @internal
 */
final class ContainsMatch
{
    private const ESCAPE = '!';

    public static function where(EloquentBuilder|QueryBuilder $builder, string $column, string $term, string $boolean = 'and'): void
    {
        $base = $builder instanceof ConcreteEloquentBuilder ? $builder->getQuery() : $builder;
        // wrap() keeps JSON paths such as `title->en` working, as a plain where() would.
        $wrapped = $base->getGrammar()->wrap($column);

        $builder->whereRaw(
            $wrapped.' like ? escape \''.self::ESCAPE.'\'',
            ['%'.self::escape($term).'%'],
            $boolean,
        );
    }

    private static function escape(string $term): string
    {
        return str_replace(
            [self::ESCAPE, '%', '_'],
            [self::ESCAPE.self::ESCAPE, self::ESCAPE.'%', self::ESCAPE.'_'],
            $term,
        );
    }
}
