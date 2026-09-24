<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Http\PageGate;
use Tbtop\Admin\Http\ResolvedPage;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;

/** The current panel's pages as the MCP server sees them: ->mcp(false) pages do not exist here. */
final class PanelPages
{
    public function __construct(private readonly CurrentPanel $panel) {}

    public static function current(): self
    {
        $panel = CurrentPanel::current();
        if ($panel === null) {
            throw new AgentError('No panel is bound to this MCP endpoint.');
        }

        return new self($panel);
    }

    /** @return list<class-string<Page>> */
    public function all(): array
    {
        return array_values(array_filter($this->panel->pages(), static fn (string $class): bool => $class::mcp()));
    }

    /** @return class-string<Page> */
    public function find(string $slug): string
    {
        foreach ($this->all() as $class) {
            if ($class::slug() === $slug) {
                return $class;
            }
        }

        throw new AgentError("Unknown page \"{$slug}\". Call search() to list pages.");
    }

    /** @param  class-string<Page>  $class @return list<string> */
    public static function pathParams(string $class): array
    {
        preg_match_all('/\{(\w+)\??\}/', $class::path(), $matches);

        return $matches[1];
    }

    /** @param  class-string<Page>  $class */
    public function routeName(string $class, string $endpoint = ''): string
    {
        return 'tbtop.'.$this->panel->id().'.'.$class::slug().$endpoint;
    }

    /**
     * Builds the page for $params behind the gate of the page its route matched
     * — view() may findOrFail(), so a denied user must not reach it.
     *
     * @param  class-string<Page>  $class
     * @param  array<string, string>  $params
     */
    public function resolve(string $class, array $params): ResolvedPage
    {
        return RouteBoundRequest::run(
            $this->routeName($class),
            self::routeParams($class, $params),
            'GET',
            [],
            static function ($request): ResolvedPage {
                PageGate::authorize($request);

                return ResolvedPage::fromRequest($request);
            },
        );
    }

    /**
     * The page's own route params out of $params; a missing one is an agent error.
     *
     * @param  class-string<Page>  $class
     * @param  array<string, mixed>  $params
     * @return array<string, string>
     */
    public static function routeParams(string $class, array $params): array
    {
        $out = [];
        foreach (self::pathParams($class) as $name) {
            $value = $params[$name] ?? null;
            if (! is_scalar($value) || (string) $value === '') {
                throw new AgentError("Page \"{$class::slug()}\" needs params: ".implode(', ', self::pathParams($class)).'.');
            }
            $out[$name] = (string) $value;
        }

        return $out;
    }
}
