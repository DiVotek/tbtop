<?php

use Illuminate\Http\Request;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Actions\RecordAction;
use Tbtop\Admin\Dsl\S;

/** @return list<array<string, mixed>> */
function runRecordActionHandler(ActionBuilder $action, ActionCtx $ctx): array
{
    $effects = ($action->handler())($ctx);

    return json_decode(json_encode($effects), true);
}

it('server() void closure falls back to the "Done" notify tail in English by default', function (): void {
    $s = new S;
    $action = RecordAction::server($s, 'noop', fn (ActionCtx $ctx) => null);

    $json = runRecordActionHandler($action, new ActionCtx(request: new Request, user: null, row: ['id' => 1]));

    expect($json)->toContain(['kind' => 'notify', 'message' => 'Done', 'level' => 'success']);
});

it('server() void closure resolves the "Done" notify tail in Ukrainian when the app locale is uk', function (): void {
    app()->setLocale('uk');
    $s = new S;
    $action = RecordAction::server($s, 'noop', fn (ActionCtx $ctx) => null);

    $json = runRecordActionHandler($action, new ActionCtx(request: new Request, user: null, row: ['id' => 1]));

    expect($json)->toContain(['kind' => 'notify', 'message' => 'Готово', 'level' => 'success']);
});

it('bulk() empty selection notifies "Nothing selected." in English by default', function (): void {
    $s = new S;
    $action = RecordAction::bulk($s, 'noopBulk', fn (ActionCtx $ctx) => null);

    $json = runRecordActionHandler($action, new ActionCtx(request: new Request, user: null, selection: []));

    expect($json)->toBe([['kind' => 'notify', 'message' => 'Nothing selected.', 'level' => 'warning']]);
});

it('bulk() empty selection resolves "Nothing selected." in Ukrainian when the app locale is uk', function (): void {
    app()->setLocale('uk');
    $s = new S;
    $action = RecordAction::bulk($s, 'noopBulk', fn (ActionCtx $ctx) => null);

    $json = runRecordActionHandler($action, new ActionCtx(request: new Request, user: null, selection: []));

    expect($json)->toBe([['kind' => 'notify', 'message' => 'Нічого не вибрано.', 'level' => 'warning']]);
});
