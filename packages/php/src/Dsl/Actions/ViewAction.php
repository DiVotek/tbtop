<?php

namespace Tbtop\Admin\Dsl\Actions;

use Closure;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt read-only detail modal — a close-only modal whose body is built
 * once at author time via $render(). Live per-row values come from
 * S::displayValue()->field() nodes, resolved client-side from the modal's
 * fetched data (the $loadUsing query) by field name.
 */
final class ViewAction
{
    /**
     * @param  Closure(ActionCtx): array<string, mixed>  $loadUsing
     * @param  Closure(): Node  $render
     */
    public static function make(
        S $s,
        Closure $loadUsing,
        Closure $render,
        string $name = 'view',
        string $title = 'View record',
    ): ActionBuilder {
        $body = $s->stack([
            $render(),
            $s->actionsRow([self::closeAction($s, $name)]),
        ]);

        return $s->action($name)
            ->label('View')
            ->modal($title, $body)
            ->query($loadUsing, needs: ['row']);
    }

    /** The Close button — a server round-trip that only closes the modal. */
    private static function closeAction(S $s, string $name): ActionBuilder
    {
        return $s->action($name.'Close')->label('Close')
            ->handle(static fn (): Effects => Effects::make()->closeModal());
    }
}
