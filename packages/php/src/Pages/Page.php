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

    /** Gate ability required to view this page. Null means no gate (public to authenticated). */
    public static function can(): ?string
    {
        return null;
    }

    /**
     * Breadcrumbs override. Return an array of [{label, url?}] items, or a Closure
     * that receives the resolved page instance and returns the same array.
     * Null means auto-build from nav tree.
     *
     * @return array<int, array{label: string, url?: string}>|\Closure|null
     */
    public function breadcrumbs(): array|\Closure|null
    {
        return null;
    }

    /**
     * Shell layout to use when rendering this page.
     * 'admin' = full admin shell with sidebar/header.
     * 'center' = chrome-less, content centered horizontally and vertically.
     */
    public function layout(): string
    {
        return 'admin';
    }
}
