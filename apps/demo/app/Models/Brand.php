<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

/**
 * Translatable name via Spatie HasTranslations — the standard Laravel way to
 * store translations. Exercises the table's ->translatable() column projection
 * against a real Spatie model (not just an 'array' cast like Post).
 */
class Brand extends Model
{
    use HasFactory;
    use HasTranslations;

    protected $guarded = [];

    /** @var list<string> */
    public array $translatable = ['name'];
}
