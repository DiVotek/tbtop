<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Plain Laravel 'array'-cast translatable column — the demo Post shape.
 * data_get() returns the decoded map; toArray() re-emits it. The fix reads
 * getRawOriginal() (raw DB JSON) so this and the Spatie shape share a path.
 */
class ArrayCastPost extends Model
{
    protected $table = 'ftposts';

    public $timestamps = false;

    protected $fillable = ['name', 'views'];

    protected $casts = ['name' => 'array', 'views' => 'integer'];
}
