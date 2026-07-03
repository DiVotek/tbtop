<?php

namespace Tbtop\Admin\Dsl\Actions;

use Closure;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Shared wiring for record-scoped server actions: a `$s->action()` whose handler
 * needs the row (or the selection), runs the consumer closure, and falls back to
 * a default notify/refresh tail when that closure returns void/null.
 *
 * The prebuilt CRUD helpers (Delete/Replicate, plus M-91's Restore/ForceDelete)
 * are thin presets over this. Building atop S::action() is mandatory: it both
 * creates AND registers the builder in the request-scoped registry the HTTP
 * layer reads by name — a bare ActionBuilder would 404 at dispatch.
 */
final class RecordAction
{
    /**
     * A single-row server action (needs: ['row']). The wrapper runs $userFn with
     * the row context; a void/null return yields $defaultTail.
     */
    public static function server(S $s, string $name, Closure $userFn, ?Effects $defaultTail = null): ActionBuilder
    {
        $tail = $defaultTail ?? self::defaultTail();

        return $s->action($name)->handle(self::wrap($userFn, $tail), needs: ['row']);
    }

    /**
     * A bulk server action (needs: ['selection']). An empty selection is a benign
     * no-op: it notifies and skips the consumer closure entirely.
     */
    public static function bulk(S $s, string $name, Closure $userFn, ?Effects $defaultTail = null): ActionBuilder
    {
        $tail = $defaultTail ?? self::defaultTail();

        return $s->action($name)->handle(self::wrapBulk($userFn, $tail), needs: ['selection']);
    }

    /**
     * Rebuild the form node with the given inner actions appended as an actionsRow.
     *
     * @param  list<ActionBuilder>  $actions
     */
    public static function formWithActions(FormBuilder $form, S $s, array $actions): Node
    {
        $node = $form->toNode();
        $children = $node->options['children'] ?? [];
        $children[] = $s->actionsRow($actions);

        return new Node('form', [...$node->options, 'children' => $children], $node->name, $node->meta);
    }

    /**
     * Wrap a consumer closure so a void/null return falls back to the default
     * tail. Returning Effects from the closure overrides the tail entirely.
     */
    private static function wrap(Closure $userFn, Effects $tail): Closure
    {
        return static function (ActionCtx $ctx) use ($userFn, $tail): Effects {
            $result = $userFn($ctx);

            return $result instanceof Effects ? $result : $tail;
        };
    }

    /** Bulk wrapper: short-circuit an empty selection before touching $userFn. */
    private static function wrapBulk(Closure $userFn, Effects $tail): Closure
    {
        return static function (ActionCtx $ctx) use ($userFn, $tail): Effects {
            if ($ctx->selection === []) {
                return Effects::make()->notify('Nothing selected.', 'warning');
            }
            $result = $userFn($ctx);

            return $result instanceof Effects ? $result : $tail;
        };
    }

    private static function defaultTail(): Effects
    {
        return Effects::make()->notify('Done')->refreshTable();
    }
}
