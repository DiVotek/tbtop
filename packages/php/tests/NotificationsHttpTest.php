<?php

use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

/**
 * @param  array<string, mixed>  $data
 */
function makeNote(
    array $data = [],
    ?string $readAt = null,
    mixed $notifiableId = null,
    ?string $createdAt = null,
): DatabaseNotification {
    $user = auth()->user();

    return DatabaseNotification::create(array_filter([
        'id' => (string) Str::uuid(),
        'type' => 'tbtop',
        'notifiable_type' => $user->getMorphClass(),
        'notifiable_id' => $notifiableId ?? $user->getKey(),
        'data' => array_merge(['title' => 'Hi'], $data),
        'read_at' => $readAt,
        'created_at' => $createdAt,
    ], static fn ($value): bool => $value !== null));
}

it('lists the current user notifications newest-first with an unread count', function () {
    makeNote(['title' => 'older'], readAt: now()->toDateTimeString(), createdAt: now()->subMinute()->toDateTimeString());
    makeNote(['title' => 'newer']);

    $res = $this->getJson('/admin/api/notifications')->assertOk();

    expect($res->json('unreadCount'))->toBe(1)
        ->and($res->json('data.0.title'))->toBe('newer')
        ->and($res->json('data.1.title'))->toBe('older')
        ->and($res->json('data.0.readAt'))->toBeNull();
});

it('excludes other users notifications', function () {
    makeNote(['title' => 'mine']);
    makeNote(['title' => 'theirs'], notifiableId: 999);

    $res = $this->getJson('/admin/api/notifications')->assertOk();

    expect($res->json('data'))->toHaveCount(1)
        ->and($res->json('data.0.title'))->toBe('mine')
        ->and($res->json('unreadCount'))->toBe(1);
});

it('caps the list to the limit param but counts all unread', function () {
    foreach (range(1, 5) as $i) {
        makeNote(['title' => "n{$i}"]);
    }

    $res = $this->getJson('/admin/api/notifications?limit=2')->assertOk();

    expect($res->json('data'))->toHaveCount(2)
        ->and($res->json('unreadCount'))->toBe(5);
});

it('projects body, color, and actions from the stored data', function () {
    makeNote([
        'body' => 'Car #42 booked',
        'color' => 'success',
        'actions' => [['label' => 'View', 'url' => '/admin/x', 'newTab' => true]],
    ]);

    $item = $this->getJson('/admin/api/notifications')->assertOk()->json('data.0');

    expect($item['body'])->toBe('Car #42 booked')
        ->and($item['color'])->toBe('success')
        ->and($item['actions'])->toBe([['label' => 'View', 'url' => '/admin/x', 'newTab' => true]]);
});

it('marks a single notification read', function () {
    $note = makeNote();

    $this->postJson("/admin/api/notifications/{$note->id}/read")->assertNoContent();

    expect($note->fresh()->read_at)->not->toBeNull();
});

it('refuses to mark another users notification read', function () {
    $note = makeNote(notifiableId: 999);

    $this->postJson("/admin/api/notifications/{$note->id}/read")->assertNotFound();

    expect($note->fresh()->read_at)->toBeNull();
});

it('clears only the current user notifications', function () {
    makeNote();
    makeNote();
    $other = makeNote(notifiableId: 999);

    $this->deleteJson('/admin/api/notifications')->assertNoContent();

    expect($this->getJson('/admin/api/notifications')->json('data'))->toHaveCount(0)
        ->and(DatabaseNotification::find($other->id))->not->toBeNull();
});

it('deletes a single notification', function () {
    $note = makeNote();

    $this->deleteJson("/admin/api/notifications/{$note->id}")->assertNoContent();

    expect(DatabaseNotification::find($note->id))->toBeNull();
});

it('refuses to delete another users notification', function () {
    $note = makeNote(notifiableId: 999);

    $this->deleteJson("/admin/api/notifications/{$note->id}")->assertNotFound();

    expect(DatabaseNotification::find($note->id))->not->toBeNull();
});
