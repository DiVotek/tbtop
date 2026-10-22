<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Pages\Page;

/**
 * The page gate (Page::can()) — one implementation for the page-scoped
 * controllers (AuthorizesPage) and the MCP server's discovery.
 */
final class PageGate
{
    /** Gate::authorize() the page on $request's matched route (its `tbtopPage`), if it declares a gate. */
    public static function authorize(Request $request): void
    {
        $class = $request->route()?->parameter('tbtopPage');
        if (! is_string($class) || ! is_subclass_of($class, Page::class)) {
            return;
        }
        $gate = $class::can();
        if ($gate !== null) {
            Gate::authorize(...self::gateArguments($gate));
        }
    }

    /** @param  class-string<Page>  $class */
    public static function allows(string $class): bool
    {
        return self::passes($class::can());
    }

    /**
     * Whether a Page::can() value lets the current user through. Null passes.
     *
     * @param  string|array{0: string, 1: class-string}|null  $gate
     */
    public static function passes(string|array|null $gate): bool
    {
        return $gate === null || Gate::allows(...self::gateArguments($gate));
    }

    /**
     * Gate call arguments for a Page::can() value: an ability alone, or an
     * ability plus the model class its policy is resolved from.
     *
     * @param  string|array{0: string, 1: class-string}  $gate
     * @return array{0: string, 1: array<int, class-string>}
     */
    private static function gateArguments(string|array $gate): array
    {
        return is_string($gate) ? [$gate, []] : [$gate[0], [$gate[1]]];
    }
}
