<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Related model for the dotted relation-column projection test
 * (Car belongsTo Location → Column::make('location.name')).
 *
 * Soft-deletable so the relation sort tests can prove the related model's
 * global scopes survive into the correlated ORDER BY subquery.
 */
class LocationModel extends Model
{
    use SoftDeletes;

    protected $table = 'locations';

    public $timestamps = false;

    protected $fillable = ['name'];
}
