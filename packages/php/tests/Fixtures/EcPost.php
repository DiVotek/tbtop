<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Minimal Eloquent model for editable-column HTTP tests.
 */
class EcPost extends Model
{
    protected $table = 'ecposts';

    public $timestamps = false;

    protected $fillable = ['title', 'published', 'note', 'status'];

    protected $casts = ['published' => 'boolean'];

    /** @return HasMany<EcComment, $this> */
    public function comments(): HasMany
    {
        return $this->hasMany(EcComment::class, 'ec_post_id');
    }
}
