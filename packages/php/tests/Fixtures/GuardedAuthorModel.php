<?php

namespace Tbtop\Admin\Tests\Fixtures;

/** AuthorModel with nothing fillable — proves relation create does not rely on $fillable. */
class GuardedAuthorModel extends AuthorModel
{
    protected $fillable = [];
}
