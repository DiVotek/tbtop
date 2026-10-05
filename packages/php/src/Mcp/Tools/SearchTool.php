<?php

namespace Tbtop\Admin\Mcp\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Str;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;
use Tbtop\Admin\Http\PageGate;
use Tbtop\Admin\Mcp\PageSurface;
use Tbtop\Admin\Mcp\PanelPages;
use Tbtop\Admin\Pages\Page;
use Throwable;

#[IsReadOnly]
final class SearchTool extends Tool
{
    use AnswersAgent;

    protected string $name = 'search';

    protected string $description = <<<'TXT'
        Discover what you can do in this admin panel. Without arguments: every page you may open, plus the
        executables (actions/forms) and tables of pages that take no params. With `page` (+ `params` for a
        page whose path has params, e.g. a record id, as strings): that page's executables and tables. Each
        executable lists its `needs` (form/row/selection) and form fields with Laravel validation rules;
        a `translatable` field takes an object keyed by locale (see its nestedRules). A form's `values` are
        its current data — build edits from them, not from query() rows, which are formatted for display.
        A field you omit is absent from the handler's input; resend `values` for fields you keep.
        A container's row fields follow it as `name.*.child`; send rows as a list of objects.
        Fields listed in a form's `excludedFields` cannot be changed: omit them, or send the value `values`
        holds (as in a repeater row you resend whole); execute() refuses any other value.
        A richtext value is a Lexical editor state {root: {type: "root", children: [...]}} built from the
        node types in its `nodes`; copy the node shape from `values`, the error names a missing key. An
        `embeds` entry is a root child {type: "embed", version: 1, id (unique), kind, data} whose
        `data` fills that kind's `fields`.
        A field with `options: "dynamic"` lists its choices through query() (`executable` + `field`, with
        `deps` for the names in its `dependsOn`). A `mask` formats a text value: 9 digit, a letter, * letter
        or digit, any other character literal; send the value as the mask formats it, literals included.
        TXT;

    public function schema(JsonSchema $schema): array
    {
        return [
            'page' => $schema->string()->description('Page slug from a previous search().'),
            'params' => $schema->object()->description('Route params of the page as strings, e.g. {"post": "12"}.'),
        ];
    }

    public function handle(Request $request): Response
    {
        return $this->answer(function () use ($request): array {
            $pages = PanelPages::current();
            $slug = $request->get('page');
            if (is_string($slug) && $slug !== '') {
                $class = $pages->find($slug);

                return self::page($pages, $class, self::objectArg($request->get('params')));
            }

            return ['pages' => array_values(array_filter(array_map(
                static fn (string $class): ?array => self::listed($pages, $class),
                $pages->all(),
            )))];
        });
    }

    /**
     * @param  class-string<Page>  $class
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private static function page(PanelPages $pages, string $class, array $params): array
    {
        $resolved = $pages->resolve($class, $params);

        return ['page' => $class::slug(), 'title' => $resolved->page->title(), ...PageSurface::describe($resolved)];
    }

    /**
     * A page in the bare listing; a page one of whose view()s fails is listed
     * with an error rather than failing the whole search.
     *
     * @param  class-string<Page>  $class
     * @return array<string, mixed>|null
     */
    private static function listed(PanelPages $pages, string $class): ?array
    {
        if (! PageGate::allows($class)) {
            return null;
        }
        $params = PanelPages::pathParams($class);
        if ($params !== []) {
            return ['page' => $class::slug(), 'title' => Str::headline(class_basename($class)), 'params' => $params];
        }
        try {
            return self::page($pages, $class, []);
        } catch (Throwable $e) {
            report($e);

            return ['page' => $class::slug(), 'error' => 'This page failed to build; see the application log.'];
        }
    }
}
