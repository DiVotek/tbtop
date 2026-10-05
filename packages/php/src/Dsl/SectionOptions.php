<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

/**
 * The section() option keys that carry links and header actions: 'url' +
 * 'openUrlInNewTab' (the whole section as one link), 'actions' (header-row
 * actions) and the deprecated 'action' array it replaces. Kept out of S so the
 * factory stays a key whitelist plus one call. Keys are rewritten in place, so
 * the option order an author wrote is the order on the wire.
 */
final class SectionOptions
{
    private const DEPRECATION = "section(): the 'action' option is deprecated and will be removed in 1.0. "
        ."Use 'actions' => [\$s->action(...)->url(...)->link()] instead. "
        .'The header link now renders with action-link styling (primary color).';

    /**
     * @param  array<string, mixed>  $opts
     * @return array<string, mixed>
     */
    public static function normalize(array $opts): array
    {
        // A null legacy 'action' (the `$cond ? [...] : null` pattern) was always
        // ignored; it stays a no-op, without the deprecation.
        if (array_key_exists('action', $opts) && $opts['action'] === null) {
            unset($opts['action']);
        }
        $legacy = null;
        if (array_key_exists('action', $opts)) {
            trigger_error(self::DEPRECATION, E_USER_DEPRECATED);
            $legacy = self::legacyAction($opts['action']);
            if (array_key_exists('actions', $opts)) {
                throw new InvalidArgumentException("section 'action' and 'actions' cannot be combined; use 'actions' only.");
            }
        }

        $out = [];
        foreach ($opts as $key => $value) {
            match ($key) {
                'url' => $out = [...$out, 'url' => self::url($value), ...self::newTab($opts)],
                'openUrlInNewTab' => self::assertBool($value),
                'action' => $out['actions'] = [$legacy],
                'actions' => $out['actions'] = self::actions($value),
                default => $out[$key] = $value,
            };
        }
        if (($out['actions'] ?? null) === []) {
            unset($out['actions']);
        }

        return $out;
    }

    private static function url(mixed $url): string
    {
        if (! is_string($url) || $url === '') {
            throw new InvalidArgumentException("section 'url' must be a non-empty string.");
        }

        return $url;
    }

    /**
     * Wire 'newTab' rides right after 'url', and only when true (as Stat does).
     *
     * @param  array<string, mixed>  $opts
     * @return array{newTab?: true}
     */
    private static function newTab(array $opts): array
    {
        return ($opts['openUrlInNewTab'] ?? false) === true ? ['newTab' => true] : [];
    }

    private static function assertBool(mixed $value): void
    {
        if (! is_bool($value)) {
            throw new InvalidArgumentException("section 'openUrlInNewTab' must be a bool.");
        }
    }

    /** @return list<ActionBuilder> */
    private static function actions(mixed $actions): array
    {
        if (! is_array($actions)) {
            throw new InvalidArgumentException("section 'actions' must be a list of ActionBuilder.");
        }
        foreach ($actions as $action) {
            if (! $action instanceof ActionBuilder) {
                throw new InvalidArgumentException(
                    "section 'actions' entries must be ActionBuilder, got ".get_debug_type($action).'.'
                );
            }
        }

        /** @var list<ActionBuilder> */
        return S::normalizeChildren(array_values($actions));
    }

    /**
     * The deprecated ['label' => ..., 'url' => ...] array as the canon action.
     * Built directly, not via $s->action(): url-only, nothing to dispatch, so it
     * stays out of the page registry and cannot collide with another name.
     */
    private static function legacyAction(mixed $action): ActionBuilder
    {
        if (! is_array($action) || ! isset($action['label']) || ! isset($action['url'])) {
            throw new InvalidArgumentException(
                "section 'action' requires both 'label' and 'url' keys."
            );
        }

        return (new ActionBuilder('section-action'))
            ->label((string) $action['label'])
            ->url((string) $action['url'])
            ->link()
            ->size('sm');
    }
}
