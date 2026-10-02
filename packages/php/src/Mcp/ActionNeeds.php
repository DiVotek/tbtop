<?php

namespace Tbtop\Admin\Mcp;

/**
 * Refuses an execute() call that omits what the action's handler reads, so a
 * handler never runs on a null row or selection and reports a false success.
 * MCP-only: the browser always sends what the UI wired (adr/mcp.md).
 */
final class ActionNeeds
{
    /** The record key a row carries, as the client reads it (normalize.ts readId). */
    private const ROW_KEY = 'id';

    private const HINTS = [
        'form' => 'Pass form with the fields search() lists.',
        'row' => 'Pass a row from query().',
        'selection' => 'Pass row keys from query() as selection.',
    ];

    /**
     * `form: {}` counts as sent; `selection` counts only as a non-empty list of
     * keys, and a row must keep its key. A key is an int or a non-empty string —
     * `whereKey()` given null or an array reports success on the wrong rows. Only
     * the key's shape is checked; the record is not loaded.
     *
     * @param  list<string>  $needs  the action's spec `needs`, in its own order
     */
    public static function assertSent(string $id, array $needs, mixed $form, mixed $row, mixed $selection): void
    {
        $sent = [
            'form' => is_array($form),
            'row' => is_array($row),
            'selection' => is_array($selection) && $selection !== [] && array_filter($selection, self::isKey(...)) === $selection,
        ];
        $missing = array_values(array_filter($needs, static fn (string $need): bool => ! ($sent[$need] ?? true)));
        if ($missing !== []) {
            $hints = implode(' ', array_map(static fn (string $need): string => self::HINTS[$need], $missing));

            throw new AgentError("\"{$id}\" needs ".implode(', ', $missing).". {$hints}");
        }
        if (in_array('row', $needs, true) && is_array($row) && ! self::isKey($row[self::ROW_KEY] ?? null)) {
            throw new AgentError("\"{$id}\" needs a row with its key \"".self::ROW_KEY.'". Pass a row from query() unchanged.');
        }
    }

    private static function isKey(mixed $key): bool
    {
        return is_int($key) || (is_string($key) && $key !== '');
    }
}
