<?php

namespace Tbtop\Admin\Dsl\Actions;

use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt form-footer actions — the Save submit button and the
 * Save/Cancel footer row most edit pages hand-roll identically.
 *
 * Both build atop S::action() so each button creates AND registers in the
 * request-scoped registry the HTTP layer reads by name — a bare ActionBuilder
 * would 404 at dispatch.
 *
 * Returns the configured ActionBuilder so label/color stay overridable by
 * chaining tbtop's fluent API.
 */
final class FormActions
{
    /** The primary Save submit button with the mod+s keybinding. */
    public static function save(S $s, string $label = 'Save'): ActionBuilder
    {
        return $s->action('save')->label($label)->color('primary')
            ->keybinding('mod+s')->submit();
    }

    /**
     * A Save/Cancel footer row. Extra actions land between Save and Cancel —
     * e.g. a mid-footer Delete on an edit page.
     *
     * @param  list<ActionBuilder>  $extra
     */
    public static function saveCancel(S $s, string $cancelUrl, string $saveLabel = 'Save', array $extra = []): Node
    {
        return $s->actionsRow([
            self::save($s, $saveLabel),
            ...$extra,
            $s->action('cancel')->label('Cancel')->visit($cancelUrl),
        ]);
    }
}
