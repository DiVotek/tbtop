<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    protected $guarded = [];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
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
