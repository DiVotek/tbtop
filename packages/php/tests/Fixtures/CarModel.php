<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model with a belongsTo relation, exercising the model array
 * projection path for a dotted column (Column::make('location.name')).
 */
class CarModel extends Model
{
    protected $table = 'cars';

    public $timestamps = false;

    protected $fillable = ['name', 'location_id'];

    public function location(): BelongsTo
    {
        return $this->belongsTo(LocationModel::class, 'location_id');
    }
}
