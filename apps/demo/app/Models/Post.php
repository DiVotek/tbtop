<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = [];

    /** @var list<string> */
    protected $appends = ['published_time'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** Same instant as published_at, appended under a distinct wire key. */
    protected function publishedTime(): Attribute
    {
        return Attribute::make(get: fn () => $this->published_at);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'title' => 'array',
            'intro' => 'array',
            'body' => 'array',
            'published' => 'boolean',
            'published_at' => 'datetime',
            'views' => 'integer',
            'rating' => 'float',
            'metadata' => 'array',
            'author_id' => 'integer',
            'sections' => 'array',
        ];
    }
}
