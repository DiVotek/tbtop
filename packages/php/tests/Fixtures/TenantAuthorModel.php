<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Builder;

/** AuthorModel with a where()-adding global scope, the way a tenant scope is written. */
class TenantAuthorModel extends AuthorModel
{
    protected static function booted(): void
    {
        static::addGlobalScope('tenant', fn (Builder $query) => $query->where('name', 'like', 'T%'));
    }
}
