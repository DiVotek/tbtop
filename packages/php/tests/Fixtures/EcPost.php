<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Minimal Eloquent model for editable-column HTTP tests.
 */
class EcPost extends Model
{
    protected $table = 'ecposts';

    public $timestamps = false;

    protected $fillable = ['title', 'published', 'note'];

    protected $casts = ['published' => 'boolean'];
}
