<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Rebuilds a page per request: closures (form submit, server actions)
 * are never serialized — they are re-resolved by name from a fresh view().
 */
final class ResolvedPage
{
    /** @param  list<Node>  $headerActions */
    public function __construct(
        public readonly Page $page,
        public readonly S $s,
        public readonly Node $tree,
        public readonly array $headerActions,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $route = $request->route();
        $class = $route?->parameter('tbtopPage');
        if (! is_string($class) || ! is_subclass_of($class, Page::class)) {
            throw new NotFoundHttpException('Unknown tabletop page.');
        }
        /** @var Page $page */
        $page = app($class);
        $s = new S;
        $tree = $page->view($s);

        $headerActions = array_map(
            fn (ActionBuilder|Node $action): Node => $action instanceof ActionBuilder ? $action->toNode() : $action,
            S::normalizeChildren($page->headerActions($s)),
        );

        return new self($page, $s, $tree, $headerActions);
    }

    /** Route params excluding tbtop internals. @return array<string, string> */
    public static function routeParams(Request $request): array
    {
        $params = $request->route()?->parameters() ?? [];
        unset($params['tbtopPage'], $params['tbtopForm'], $params['tbtopAction']);

        return array_map(static fn ($p) => is_string($p) ? $p : (string) $p, $params);
    }
}
