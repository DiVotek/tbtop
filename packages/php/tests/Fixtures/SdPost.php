<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Minimal soft-deleting Eloquent model for the M-91 soft-delete tests.
 */
class SdPost extends Model
{
    use SoftDeletes;

    protected $table = 'sdposts';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['published' => 'boolean'];
}
