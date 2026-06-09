<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    protected $table = 'media';

    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'filesize' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'sizes' => 'array',
        ];
    }
}
