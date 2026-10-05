<?php

namespace Tbtop\Admin\Mcp;

use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\StructureWalk;
use Tbtop\Admin\Http\ActionFormRules;
use Tbtop\Admin\Http\ResolvedPage;

/**
 * What a built page offers an agent: executables (server actions and onSubmit
 * forms, one kind to the agent), queryable tables, and what was left out and why.
 */
final class PageSurface
{
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
                $form = ActionFormRules::enclosingForm($resolved, $name);
                $reason = self::unfillableReason($form, ! $action->skipsFormValidation());
                if ($reason !== null) {
                    $excluded[] = ['id' => "{$slug}:{$name}", 'reason' => $reason];
                } else {
                    $executables[] = self::action($slug, $action, $form, $tableOf[$name] ?? null);
                }
            }
        }

        foreach (array_keys($resolved->s->collectedForms()) as $name) {
            $form = $resolved->s->reachableForm($name);
            if ($form?->submitHandler() === null || isset($resolved->s->collectedActions()[$name])) {
                continue;
            }
            $reason = self::unfillableReason($form, true);
            if ($reason !== null) {
                $excluded[] = ['id' => "{$slug}:{$name}", 'reason' => $reason];
            } else {
                $executables[] = ['id' => "{$slug}:{$name}", 'kind' => 'form', ...FormArguments::describe($form)];
            }
        }

        return ['executables' => $executables, 'tables' => self::tables($resolved), 'excluded' => $excluded];
    }

    /** Why an executable submitting $form is excluded, or null — see FormArguments::unfillableReason(). */
    private static function unfillableReason(?FormBuilder $form, bool $validated): ?string
    {
        return $form === null ? null : FormArguments::unfillableReason($form, $validated);
    }

    /**
     * Whether search() lists an executable submitting $form as excluded, so
     * execute refuses it too. $validated: the executable validates the form
     * (an onSubmit form, or an action without ->withoutValidation()).
     */
    public static function isUnfillableForm(?FormBuilder $form, bool $validated): bool
    {
        return self::unfillableReason($form, $validated) !== null;
    }

    /** The action behind $name when this user may run it over MCP, else null. */
    public static function exposedAction(ResolvedPage $resolved, string $name): ?ActionBuilder
    {
        $action = $resolved->s->reachableAction($name);

        return $action?->isMcpEnabled() === true ? $action : null;
    }

    /** @return array<string, mixed> */
    private static function action(string $slug, ActionBuilder $action, ?FormBuilder $form, ?string $table): array
    {
        $node = StructureWalk::resolveActionNode($action);
        $needs = $action->getSpec()['needs'] ?? [];

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
                $out[] = TableArguments::describe($table);
            }
        }

        return $out;
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
