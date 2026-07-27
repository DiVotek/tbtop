<?php

namespace Tbtop\Admin\Tests\Fixtures;

/**
 * Same table as EcPost, but every hydrated instance gets a non-column
 * attribute stamped on it via the `retrieved` model event — the pattern a
 * real app uses to annotate rows with a computed/derived flag (e.g.
 * "is_returning"). Reproduces the editable-column save bug: the synthetic
 * attribute becomes dirty as soon as any real column changes, and
 * Eloquent tries to write it as a column on save().
 */
class EcPostWithSynthetic extends EcPost
{
    protected static function booted(): void
    {
        static::retrieved(function (self $model): void {
            $model->setAttribute('is_returning', true);
        });
    }
}
