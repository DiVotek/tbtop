<?php

namespace Tbtop\Admin\Commands\Resource;

/**
 * Restore and force-delete actions for a soft-deleting resource under
 * --policy. The package's softDeletes() actions check no policy, so the
 * generated page writes its own, each authorizing the record it touches.
 *
 * @internal
 */
final class TrashedActions
{
    private const PAD = '                    ';

    public static function row(string $model): string
    {
        return self::action('server', $model, 'restore', 'restore', '$ctx->key()')
            .self::action('server', $model, 'forceDelete', 'forceDelete', '$ctx->key()');
    }

    public static function bulk(string $model): string
    {
        return self::action('bulk', $model, 'restoreSelected', 'restore', '$ctx->selection')
            .self::action('bulk', $model, 'forceDeleteSelected', 'forceDelete', '$ctx->selection');
    }

    private static function action(string $kind, string $model, string $name, string $ability, string $keys): string
    {
        $p = self::PAD;
        $body = $kind === 'server'
            ? "{$p}    \$record = {$model}::withTrashed()->whereKey({$keys})->firstOrFail();\n"
                ."{$p}    Gate::authorize('{$ability}', \$record);\n"
                ."{$p}    \$record->{$ability}();\n"
            : "{$p}    {$model}::withTrashed()->whereKey({$keys})->get()->each(function ({$model} \$record): void {\n"
                ."{$p}        Gate::authorize('{$ability}', \$record);\n"
                ."{$p}        \$record->{$ability}();\n"
                ."{$p}    });\n";

        return "\n{$p}RecordAction::{$kind}(\$s, '{$name}', function (ActionCtx \$ctx): void {\n{$body}{$p}})".self::look($ability).',';
    }

    private static function look(string $ability): string
    {
        if ($ability === 'restore') {
            return "->label(__('tbtop-admin::admin.action.restore'))->color('gray')";
        }

        return "->label(__('tbtop-admin::admin.action.force_delete'))->color('danger')\n"
            .self::PAD."    ->confirm(__('tbtop-admin::admin.force_delete.confirm.title'), __('tbtop-admin::admin.force_delete.confirm.body'))";
    }
}
