<?php

namespace Tbtop\Admin\Mcp\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;
use Tbtop\Admin\Mcp\ActionNeeds;
use Tbtop\Admin\Mcp\Execution;
use Tbtop\Admin\Mcp\FormInput;
use Tbtop\Admin\Mcp\PageSurface;
use Tbtop\Admin\Mcp\PanelPages;

/** Always destructive: actions are author-written, so a delete cannot be told from an edit. */
#[IsDestructive]
final class ExecuteTool extends Tool
{
    use AnswersAgent;

    protected string $name = 'execute';

    protected string $description = <<<'TXT'
        Run an executable found by search(), with the user's own permissions. Pass `params` — the route
        params of the page the executable lives on, for every executable of that page — and what it `needs`: `form` (field values), `row` (a row from query(),
        unchanged: it must keep its `_key`) or `selection` (the rows' `_key` values). A call missing what it needs is
        refused. Invalid input returns validation errors and runs nothing;
        every error is JSON {message, errors?}. Returns the effects the UI would show; a redirect (form
        `redirect`, or a `redirect` effect) carries the `page`/`params` it opens so you can search() it next.
        TXT;

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Executable id "{page}:{name}" from search().')->required(),
            'params' => $schema->object()->description('Route params of the page, values as strings.'),
            'form' => $schema->object()->description('Field values, for a form or an action that needs form.'),
            'row' => $schema->object()->description('A row returned by query(), for a row action.'),
            'selection' => $schema->array()->items($schema->string())
                ->description('Row keys as strings, for a bulk action; integer keys are passed on as integers.'),
        ];
    }

    public function handle(Request $request): Response
    {
        return $this->answer(function () use ($request): array {
            [$slug, $name] = array_pad(explode(':', (string) $request->get('id'), 2), 2, '');
            $pages = PanelPages::current();
            $class = $pages->find($slug);
            $params = PanelPages::routeParams($class, self::objectArg($request->get('params')));
            $resolved = $pages->resolve($class, $params);
            $execution = new Execution($pages, $class, $params);

            ['action' => $action, 'form' => $form] = PageSurface::executable($resolved, $name);
            if ($action !== null) {
                $needs = $action->getSpec()['needs'] ?? [];
                ActionNeeds::assertSent("{$slug}:{$name}", $needs, $request->get('form'), $request->get('row'), $request->get('selection'));
            }
            $input = self::objectArg($request->get('form'));
            if ($form !== null) {
                FormInput::assertSendable($form, $input);
            }
            if ($action === null) {
                return $execution->form($name, $input);
            }

            return $execution->action($name, array_filter([
                'form' => $input,
                'row' => self::objectArg($request->get('row')),
                'selection' => self::selection($request->get('selection')),
            ]));
        });
    }

    /**
     * Row keys as the browser sends them: the schema asks for strings, so a
     * canonical integer string ("12", not "012") goes back to an int.
     *
     * @return list<mixed>
     */
    private static function selection(mixed $value): array
    {
        return array_map(
            static fn (mixed $key): mixed => is_string($key) && (string) (int) $key === $key ? (int) $key : $key,
            array_values(self::objectArg($value)),
        );
    }
}
