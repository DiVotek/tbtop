<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\SoftDeletes;

/** AuthorModel with a global scope — relation create must not mistake it for a where(). */
class SoftAuthorModel extends AuthorModel
{
    use SoftDeletes;
}
