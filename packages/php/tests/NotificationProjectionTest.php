<?php

use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;
use Tbtop\Admin\Http\NotificationProjection;

/**
 * @param  array<string, mixed>  $attributes
 */
function noteModel(array $attributes): DatabaseNotification
{
    $note = new DatabaseNotification;
    $note->forceFill(array_merge([
        'id' => 'note-1',
        'type' => 'tbtop',
        'notifiable_type' => 'App\\Models\\User',
        'notifiable_id' => 1,
        'data' => ['title' => 'Hi'],
        'read_at' => null,
        'created_at' => Carbon::parse('2026-06-24T10:00:00Z'),
        'updated_at' => Carbon::parse('2026-06-24T10:00:00Z'),
    ], $attributes));

    return $note;
}

it('projects stored data plus timestamps into the wire shape', function () {
    $item = NotificationProjection::item(noteModel([
        'data' => [
            'title' => 'Booking confirmed',
            'body' => 'Car #42',
            'icon' => 'check',
            'color' => 'success',
            'actions' => [['label' => 'View', 'url' => '/x', 'newTab' => true]],
        ],
    ]));

    expect($item['id'])->toBe('note-1')
        ->and($item['title'])->toBe('Booking confirmed')
        ->and($item['body'])->toBe('Car #42')
        ->and($item['icon'])->toBe('check')
        ->and($item['color'])->toBe('success')
        ->and($item['actions'])->toBe([['label' => 'View', 'url' => '/x', 'newTab' => true]])
        ->and($item['readAt'])->toBeNull()
        ->and($item['createdAt'])->toStartWith('2026-06-24T10:00:00');
});

it('defaults missing fields and tolerates an empty data column', function () {
    $item = NotificationProjection::item(noteModel([
        'data' => [],
        'read_at' => Carbon::parse('2026-06-24T12:00:00Z'),
    ]));

    expect($item['title'])->toBe('')
        ->and($item['body'])->toBeNull()
        ->and($item['icon'])->toBeNull()
        ->and($item['actions'])->toBe([])
        ->and($item['readAt'])->toStartWith('2026-06-24T12:00:00');
});

it('drops malformed action entries', function () {
    $item = NotificationProjection::item(noteModel([
        'data' => ['title' => 'x', 'actions' => ['not-an-array', ['label' => 'Ok', 'url' => '/ok']]],
    ]));

    expect($item['actions'])->toBe([['label' => 'Ok', 'url' => '/ok']]);
});
