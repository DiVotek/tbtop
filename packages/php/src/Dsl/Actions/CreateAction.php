<?php

namespace Tbtop\Admin\Dsl\Actions;

use Closure;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt create-in-modal action — a modal whose body is the consumer's form,
 * defaulted via FormBuilder::record() (no row context) and saved by an inner
 * server action. No query(): PageController walks collectedForms() regardless
 * of nesting depth, so the modal form's defaults reach the client normally.
 */
final class CreateAction
{
    /**
     * @param  array<string, mixed>  $defaultRecord
     * @param  Closure(ActionCtx): mixed  $storeUsing
     */
    public static function make(
        S $s,
        FormBuilder $form,
        Closure $storeUsing,
        array $defaultRecord = [],
        string $name = 'create',
        string $title = 'Create record',
    ): ActionBuilder {
        $form->record($defaultRecord);

        $actions = [
            self::storeAction($s, $name.'Store', $storeUsing),
            self::cancelAction($s, $name),
        ];

        return $s->action($name)
            ->label('Create')
            ->modal($title, RecordAction::formWithActions($form, $s, $actions));
    }

    /** The Create server action — gets the form only; void return → default tail. */
    private static function storeAction(S $s, string $storeName, Closure $storeUsing): ActionBuilder
    {
        $wrapped = static function (ActionCtx $ctx) use ($storeUsing): Effects {
            $result = $storeUsing($ctx);

            return $result instanceof Effects ? $result : self::storeTail();
        };

        return $s->action($storeName)->label('Create')->color('primary')
            ->handle($wrapped, needs: ['form']);
    }

    /** The Cancel button — a server round-trip that only closes the modal. */
    private static function cancelAction(S $s, string $name): ActionBuilder
    {
        return $s->action($name.'Cancel')->label('Cancel')
            ->handle(static fn (): Effects => Effects::make()->closeModal());
    }

    private static function storeTail(): Effects
    {
        return Effects::make()->notify('Created')->closeModal()->refreshTable();
    }
}
