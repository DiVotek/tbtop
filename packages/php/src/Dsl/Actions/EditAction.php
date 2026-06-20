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
 * Prebuilt edit-in-place action — a modal whose body is the consumer's form,
 * preloaded per row via the modal data query and saved by an inner server
 * action. Composes existing primitives: modal() + query() + a nested form with
 * its own Save/Cancel actionsRow.
 *
 * Three closures from the consumer:
 *   - $form        the FormBuilder (fields only — Save/Cancel are added here)
 *   - $loadUsing   modal query; returned keys MUST match field names to prefill
 *   - $saveUsing   the update; void/null falls back to notify+closeModal+refresh
 *
 * Returns the configured modal ActionBuilder for further chaining.
 */
final class EditAction
{
    /**
     * @param  Closure(ActionCtx): array<string, mixed>  $loadUsing
     * @param  Closure(ActionCtx): mixed  $saveUsing
     * @param  string|null  $saveName  Inner save action name; defaults to "{name}Save".
     */
    public static function make(
        S $s,
        FormBuilder $form,
        Closure $loadUsing,
        Closure $saveUsing,
        string $name = 'edit',
        string $title = 'Edit record',
        ?string $saveName = null,
    ): ActionBuilder {
        $actions = [
            self::saveAction($s, $saveName ?? $name.'Save', $saveUsing),
            self::cancelAction($s, $name),
        ];

        return $s->action($name)
            ->label('Edit')
            ->modal($title, self::formWith($s, $form, $actions))
            ->query($loadUsing, needs: ['row']);
    }

    /**
     * Rebuild the form node with the given inner actions appended as an actionsRow.
     *
     * @param  list<ActionBuilder>  $actions
     */
    private static function formWith(S $s, FormBuilder $form, array $actions): Node
    {
        $node = $form->toNode();
        $children = $node->options['children'] ?? [];
        $children[] = $s->actionsRow($actions);

        return new Node('form', [...$node->options, 'children' => $children], $node->name, $node->meta);
    }

    /** The Save server action — gets row + form; void return → default tail. */
    private static function saveAction(S $s, string $saveName, Closure $saveUsing): ActionBuilder
    {
        $wrapped = static function (ActionCtx $ctx) use ($saveUsing): Effects {
            $result = $saveUsing($ctx);

            return $result instanceof Effects ? $result : self::saveTail();
        };

        return $s->action($saveName)->label('Save')->color('primary')
            ->handle($wrapped, needs: ['row', 'form']);
    }

    /** The Cancel button — a server round-trip that only closes the modal. */
    private static function cancelAction(S $s, string $name): ActionBuilder
    {
        return $s->action($name.'Cancel')->label('Cancel')
            ->handle(static fn (): Effects => Effects::make()->closeModal());
    }

    private static function saveTail(): Effects
    {
        return Effects::make()->notify('Saved')->closeModal()->refreshTable();
    }
}
