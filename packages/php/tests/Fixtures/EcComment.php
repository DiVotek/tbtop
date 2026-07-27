<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Minimal related model — exists only so EcPost's query can attach a
 * withExists() aggregate, reproducing the synthetic-attribute save bug.
 */
class EcComment extends Model
{
    protected $table = 'ec_comments';

    public $timestamps = false;

    protected $fillable = ['ec_post_id'];
}
