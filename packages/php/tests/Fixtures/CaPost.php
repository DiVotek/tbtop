<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Minimal Eloquent model for CRUD-action-helper HTTP tests.
 */
class CaPost extends Model
{
    protected $table = 'caposts';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['published' => 'boolean'];
}
