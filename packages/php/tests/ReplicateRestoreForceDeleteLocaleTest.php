<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Actions\ForceDeleteAction;
use Tbtop\Admin\Dsl\Actions\ReplicateAction;
use Tbtop\Admin\Dsl\Actions\RestoreAction;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\Fixtures\SdPost;

/**
 * Audit 9.7 remainder: PR #99 localized CreateAction/RecordAction/the
 * softDeletes tabs, but Replicate/Restore/ForceDelete still hardcoded
 * English labels and notify/confirm messages. These lock in the fix the
 * same way RecordActionDefaultTailTest.php does for RecordAction's own
 * default tail — English by default, Ukrainian when the app locale is uk.
 *
 * Restore/ForceDelete's closures run withTrashed()->whereKey(...)->firstOrFail(),
 * so a real row must exist — schema mirrors SoftDeletesHttpTest.php's setup.
 */
beforeEach(function (): void {
    Schema::create('sdposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->softDeletes();
    });
});

function actionJsonOptions(ActionBuilder $action): array
{
    return json_decode(json_encode($action), true)['options'];
}

/** @return list<array<string, mixed>> */
function runActionHandler(ActionBuilder $action, ActionCtx $ctx): array
{
    return json_decode(json_encode(($action->handler())($ctx)), true);
}

/** Creates and soft-deletes a row, returning its id. */
function trashedSdPostId(): int
{
    $post = SdPost::create(['title' => 'Trashed']);
    $post->delete();

    return $post->id;
}

// ---------------------------------------------------------------------------
// ReplicateAction
// ---------------------------------------------------------------------------

it('ReplicateAction label is English by default', function (): void {
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null);

    expect(actionJsonOptions($replicate)['label'])->toBe('Replicate');
});

it('ReplicateAction label resolves to Ukrainian when the app locale is uk', function (): void {
    app()->setLocale('uk');
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null);

    expect(actionJsonOptions($replicate)['label'])->toBe('Дублювати');
});

it('ReplicateAction default tail notifies "Record replicated" in English by default', function (): void {
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null);

    $json = runActionHandler($replicate, new ActionCtx(request: new Request, user: null, row: ['id' => 1]));

    expect($json)->toContain(['kind' => 'notify', 'message' => 'Record replicated', 'level' => 'success']);
});

it('ReplicateAction default tail notifies in Ukrainian when the app locale is uk', function (): void {
    app()->setLocale('uk');
    $s = new S;
    $replicate = ReplicateAction::make($s, using: fn (ActionCtx $ctx) => null);

    $json = runActionHandler($replicate, new ActionCtx(request: new Request, user: null, row: ['id' => 1]));

    expect($json)->toContain(['kind' => 'notify', 'message' => 'Запис дубльовано', 'level' => 'success']);
});

// ---------------------------------------------------------------------------
// RestoreAction
// ---------------------------------------------------------------------------

it('RestoreAction (single) label + notify are English by default', function (): void {
    $id = trashedSdPostId();
    $s = new S;
    $restore = RestoreAction::make($s, SdPost::class);

    expect(actionJsonOptions($restore)['label'])->toBe('Restore');

    $json = runActionHandler($restore, new ActionCtx(request: new Request, user: null, row: ['id' => $id]));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Restored', 'level' => 'success']);
});

it('RestoreAction (single) label + notify resolve to Ukrainian when the app locale is uk', function (): void {
    $id = trashedSdPostId();
    app()->setLocale('uk');
    $s = new S;
    $restore = RestoreAction::make($s, SdPost::class);

    expect(actionJsonOptions($restore)['label'])->toBe('Відновити');

    $json = runActionHandler($restore, new ActionCtx(request: new Request, user: null, row: ['id' => $id]));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Відновлено', 'level' => 'success']);
});

it('RestoreAction::bulk label + notify are English by default', function (): void {
    $ids = [trashedSdPostId(), trashedSdPostId()];
    $s = new S;
    $restore = RestoreAction::bulk($s, SdPost::class);

    expect(actionJsonOptions($restore)['label'])->toBe('Restore');

    $json = runActionHandler($restore, new ActionCtx(request: new Request, user: null, selection: $ids));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Restored selected', 'level' => 'success']);
});

it('RestoreAction::bulk label + notify resolve to Ukrainian when the app locale is uk', function (): void {
    $ids = [trashedSdPostId(), trashedSdPostId()];
    app()->setLocale('uk');
    $s = new S;
    $restore = RestoreAction::bulk($s, SdPost::class);

    expect(actionJsonOptions($restore)['label'])->toBe('Відновити');

    $json = runActionHandler($restore, new ActionCtx(request: new Request, user: null, selection: $ids));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Вибрані записи відновлено', 'level' => 'success']);
});

// ---------------------------------------------------------------------------
// ForceDeleteAction
// ---------------------------------------------------------------------------

it('ForceDeleteAction (single) label + confirm + notify are English by default', function (): void {
    $id = trashedSdPostId();
    $s = new S;
    $forceDelete = ForceDeleteAction::make($s, SdPost::class);
    $opts = actionJsonOptions($forceDelete);

    expect($opts['label'])->toBe('Delete permanently')
        ->and($opts['confirm'])->toBe([
            'title' => 'Delete permanently?',
            'description' => 'This cannot be undone.',
        ]);

    $json = runActionHandler($forceDelete, new ActionCtx(request: new Request, user: null, row: ['id' => $id]));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Deleted permanently', 'level' => 'success']);
});

it('ForceDeleteAction (single) label + confirm + notify resolve to Ukrainian when the app locale is uk', function (): void {
    $id = trashedSdPostId();
    app()->setLocale('uk');
    $s = new S;
    $forceDelete = ForceDeleteAction::make($s, SdPost::class);
    $opts = actionJsonOptions($forceDelete);

    expect($opts['label'])->toBe('Видалити назавжди')
        ->and($opts['confirm'])->toBe([
            'title' => 'Видалити назавжди?',
            'description' => 'Цю дію не можна скасувати.',
        ]);

    $json = runActionHandler($forceDelete, new ActionCtx(request: new Request, user: null, row: ['id' => $id]));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Видалено назавжди', 'level' => 'success']);
});

it('ForceDeleteAction::bulk label + confirm + notify are English by default', function (): void {
    $ids = [trashedSdPostId(), trashedSdPostId()];
    $s = new S;
    $forceDelete = ForceDeleteAction::bulk($s, SdPost::class);
    $opts = actionJsonOptions($forceDelete);

    expect($opts['label'])->toBe('Delete permanently')
        ->and($opts['confirm']['title'])->toBe('Delete permanently?');

    $json = runActionHandler($forceDelete, new ActionCtx(request: new Request, user: null, selection: $ids));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Deleted selected permanently', 'level' => 'success']);
});

it('ForceDeleteAction::bulk label + confirm + notify resolve to Ukrainian when the app locale is uk', function (): void {
    $ids = [trashedSdPostId(), trashedSdPostId()];
    app()->setLocale('uk');
    $s = new S;
    $forceDelete = ForceDeleteAction::bulk($s, SdPost::class);
    $opts = actionJsonOptions($forceDelete);

    expect($opts['label'])->toBe('Видалити назавжди')
        ->and($opts['confirm']['title'])->toBe('Видалити назавжди?');

    $json = runActionHandler($forceDelete, new ActionCtx(request: new Request, user: null, selection: $ids));
    expect($json)->toContain(['kind' => 'notify', 'message' => 'Вибрані записи видалено назавжди', 'level' => 'success']);
});
