<?php

namespace Tbtop\Admin\Tests\Fixtures\Resource;

/** An enum whose short name clashes with Tbtop\Admin\Dsl\Column. */
enum Column: string
{
    case Left = 'left';
}
