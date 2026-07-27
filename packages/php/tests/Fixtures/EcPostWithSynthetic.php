<?php

namespace Tbtop\Admin\Tests\Fixtures;

/**
 * Same table as EcPost, but every hydrated instance is annotated by a
 * `retrieved` model event — the pattern a real app uses to enrich rows on
 * fetch. The listener does two things real listeners do:
 *
 *  - stamps a non-column flag ("is_returning"), which becomes dirty the
 *    instant it's set (unlike a clean withExists() alias) and would break
 *    save() if the controller didn't neutralize it;
 *  - normalizes a REAL column ("note"), which is a legitimate dirty change
 *    that inline-save must still persist.
 */
class EcPostWithSynthetic extends EcPost
{
    protected static function booted(): void
    {
        static::retrieved(function (self $model): void {
            $model->setAttribute('is_returning', true);
            $model->setAttribute('note', 'stamped-by-listener');
        });
    }
}
