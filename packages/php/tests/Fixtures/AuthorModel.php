<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Minimal in-memory Eloquent model used by RelationSearchHttpTest.
 */
class AuthorModel extends Model
{
    protected $table = 'authors';

    public $timestamps = false;

    protected $fillable = ['name', 'title'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['title' => 'array'];
    }
}
