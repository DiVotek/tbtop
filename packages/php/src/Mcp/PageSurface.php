<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\StructureWalk;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ActionFormRules;
use Tbtop\Admin\Http\ResolvedPage;
use Tbtop\Admin\Http\TableFilterApplier;

/**
 * What a built page offers an agent: executables (server actions and onSubmit
 * forms, one kind to the agent), queryable tables, and what was left out and why.
 */
final class PageSurface
{
    private const UNFILLABLE = 'every field of its form is one MCP cannot fill (upload/media/richtext)';

    /** @return array{executables: list<array<string, mixed>>, tables: list<array<string, mixed>>, excluded: list<array<string, string>>} */
    public static function describe(ResolvedPage $resolved): array
    {
        $slug = $resolved->page::slug();
        $tableOf = self::actionTables([$resolved->tree, ...$resolved->headerActionSources], null);
        $executables = [];
        $excluded = [];

        foreach (array_keys($resolved->s->collectedActions()) as $name) {
            $action = self::exposedAction($resolved, $name);
            if ($action === null) {
                continue;
            }
            if (($action->getSpec()['type'] ?? null) === 'custom') {
                $excluded[] = ['id' => "{$slug}:{$name}", 'reason' => 'client-only custom action: it runs in the browser'];
            } elseif ($action->handler() !== null) {
                $described = self::action($resolved, $slug, $action, $tableOf[$name] ?? null);
                if (self::isUnfillable($described['form'] ?? null)) {
                    $excluded[] = ['id' => $described['id'], 'reason' => self::UNFILLABLE];
                } else {
                    $executables[] = $described;
                }
            }
        }

        foreach (array_keys($resolved->s->collectedForms()) as $name) {
            $form = $resolved->s->reachableForm($name);
            if ($form?->submitHandler() === null || isset($resolved->s->collectedActions()[$name])) {
                continue;
            }
            $described = ['id' => "{$slug}:{$name}", 'kind' => 'form', ...FormArguments::describe($form)];
            if (self::isUnfillable($described)) {
                $excluded[] = ['id' => $described['id'], 'reason' => self::UNFILLABLE];
            } else {
                $executables[] = $described;
            }
        }

        return ['executables' => $executables, 'tables' => self::tables($resolved), 'excluded' => $excluded];
    }

    /** An executable whose form has fields, none of which an agent can fill. @param  array<string, mixed>|null  $form */
    private static function isUnfillable(?array $form): bool
    {
        return $form !== null && ! FormArguments::isFillable($form);
    }

    /** The action behind $name when this user may run it over MCP, else null. */
    public static function exposedAction(ResolvedPage $resolved, string $name): ?ActionBuilder
    {
        $action = $resolved->s->reachableAction($name);

        return $action?->isMcpEnabled() === true ? $action : null;
    }

    /** @return array<string, mixed> */
    private static function action(ResolvedPage $resolved, string $slug, ActionBuilder $action, ?string $table): array
    {
        $node = StructureWalk::resolveActionNode($action);
        $needs = $action->getSpec()['needs'] ?? [];
        $form = ActionFormRules::enclosingForm($resolved, $action->name);

        return array_filter([
            'id' => "{$slug}:{$action->name}",
            'kind' => 'action',
            'label' => $node?->options['label'] ?? null,
            'confirm' => $node?->options['confirm']['title'] ?? null,
            'needs' => $needs,
            'table' => $table,
            'form' => $form === null ? null : FormArguments::describe($form),
        ], static fn (mixed $v): bool => $v !== null && $v !== []);
    }

    /** @return list<array<string, mixed>> */
    private static function tables(ResolvedPage $resolved): array
    {
        $out = [];
        foreach (array_keys($resolved->s->collectedTables()) as $name) {
            $table = $resolved->s->reachableTable($name);
            if ($table?->queryClosure() !== null) {
                $out[] = self::table($table);
            }
        }

        return $out;
    }

    /** @return array<string, mixed> */
    private static function table(TableBuilder $table): array
    {
        return array_filter([
            'table' => $table->name,
            'columns' => array_map(
                static fn (Column $c): array => array_filter(['name' => $c->name, 'label' => $c->labelText()]),
                $table->visibleColumns(),
            ),
            'search' => $table->searchableFields(),
            'columnSearch' => $table->individuallySearchableColumns(),
            'filters' => array_map(
                static fn (Field $f): array => array_filter([
                    'name' => $f->name,
                    'kind' => $f->toNode()->kind,
                    'label' => $f->labelText(),
                    'value' => TableFilterApplier::valueShape($f),
                    'options' => FormArguments::options($f),
                ]),
                $table->filterFields(),
            ),
            'tabs' => array_map(static fn (Tab $t): string => $t->name, $table->tabObjects()),
            'sortable' => $table->sortableColumnNames(),
            'pagination' => $table->paginationSpec(),
        ], static fn (mixed $v): bool => $v !== []);
    }

    /**
     * Action name => the table whose header/row/bulk action lists (or modals)
     * hold it. First placement wins, as the name resolves to one handler.
     *
     * @param  iterable<mixed>  $nodes
     * @return array<string, string>
     */
    private static function actionTables(iterable $nodes, ?string $table): array
    {
        $map = [];
        foreach ($nodes as $entry) {
            $node = StructureWalk::resolveActionNode($entry);
            if ($node === null) {
                continue;
            }
            if ($node->kind === 'action' && $node->name !== null && $table !== null) {
                $map[$node->name] ??= $table;
            }
            $scope = $node->kind === 'table' ? $node->name : $table;
            $map += self::actionTables(StructureWalk::actionSearchDescendants($node), $scope);
        }

        return $map;
    }
}
