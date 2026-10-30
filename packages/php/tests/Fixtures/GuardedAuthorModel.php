<?php

namespace Tbtop\Admin\Tests\Fixtures;

/** AuthorModel with nothing fillable — relation create refuses to write a guarded column. */
class GuardedAuthorModel extends AuthorModel
{
    protected $fillable = [];
}
