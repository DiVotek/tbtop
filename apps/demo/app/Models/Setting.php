<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'maintenance_mode' => 'boolean',
            'max_upload_mb' => 'integer',
            'launch_date' => 'datetime',
            'theme' => 'array',
        ];
    }
}
