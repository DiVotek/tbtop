<?php

namespace Tbtop\Admin\Pages;

use Illuminate\Support\Str;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

abstract class Page
{
    /** Laravel route URI relative to the admin prefix, e.g. 'posts/{post}/edit'. */
    abstract public static function path(): string;

    abstract public function view(S $s): Node;

    /** Stable identifier used in action/form endpoint URLs. */
    public static function slug(): string
    {
        return Str::kebab(class_basename(static::class));
    }

    public function title(): string
    {
        return Str::headline(class_basename(static::class));
    }

    /** Nav placement: ['group' => ..., 'label' => ..., 'order' => ...] or null to hide. @return array<string, mixed>|null */
    public static function nav(): ?array
    {
        return null;
    }
}
