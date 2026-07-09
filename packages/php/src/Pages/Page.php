<?php

namespace Tbtop\Admin\Pages;

use Illuminate\Support\Str;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\PanelConfig;

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

    /** Optional line rendered under the page title. Null renders nothing. */
    public function subtitle(): ?string
    {
        return null;
    }

    /**
     * Actions rendered right of the title/subtitle block. Reuses the action
     * DSL (S::action()), so visit/server/modal actions all work as on any
     * other page. Empty by default — renders nothing extra.
     *
     * @return list<ActionBuilder|Node>
     */
    public function headerActions(S $s): array
    {
        return [];
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
     * Per-page override of the panel's auth/app middleware stack. Applies to the
     * page and its whole endpoint cluster (forms, actions, tables, data, etc.).
     *
     * Null (default) inherits [...$panel->getMiddleware(), 'auth:'.$panel->getGuard()].
     * An array replaces that auth/app layer. The route layer always applies
     * SetCurrentPanel + SetAdminLocale on top, so a public page returning ['web']
     * still gets panel binding, locale, and the Inertia share — it just skips
     * auth:guard and any app-level auth middleware. Spread $panel->authStack() to
     * add to the panel default instead of replacing it.
     *
     * Static by necessity: route registration only has the class-string.
     *
     * @return list<string>|null
     */
    public static function middleware(PanelConfig $panel): ?array
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
