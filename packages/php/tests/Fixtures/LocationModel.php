<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Related model for the dotted relation-column projection test
 * (Car belongsTo Location → Column::make('location.name')).
 */
class LocationModel extends Model
{
    protected $table = 'locations';

    public $timestamps = false;

    protected $fillable = ['name'];
}
