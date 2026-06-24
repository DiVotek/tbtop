<?php

use Tbtop\Admin\Notifications\Notification;
use Tbtop\Admin\Notifications\NotificationAction;

it('builds a minimal payload with just a title', function () {
    expect(Notification::make()->title('Saved')->toArray())->toBe(['title' => 'Saved']);
});

it('serializes body, icon, color, and actions', function () {
    $payload = Notification::make()
        ->title('Booking confirmed')
        ->body('Car #42')
        ->icon('check')
        ->color('success')
        ->actions([
            NotificationAction::make('View')->url('/admin/bookings/42'),
            NotificationAction::make('Docs')->url('https://x.test')->openInNewTab(),
        ])
        ->toArray();

    expect($payload)->toBe([
        'title' => 'Booking confirmed',
        'body' => 'Car #42',
        'icon' => 'check',
        'color' => 'success',
        'actions' => [
            ['label' => 'View', 'url' => '/admin/bookings/42'],
            ['label' => 'Docs', 'url' => 'https://x.test', 'newTab' => true],
        ],
    ]);
});

it('maps each status sugar method to a color token', function () {
    expect(Notification::make()->title('x')->success()->toArray()['color'])->toBe('success')
        ->and(Notification::make()->title('x')->warning()->toArray()['color'])->toBe('warning')
        ->and(Notification::make()->title('x')->danger()->toArray()['color'])->toBe('danger')
        ->and(Notification::make()->title('x')->info()->toArray()['color'])->toBe('info');
});

it('omits empty optional fields and an empty actions list', function () {
    $payload = Notification::make()->title('x')->toArray();

    expect($payload)->not->toHaveKey('body')
        ->and($payload)->not->toHaveKey('color')
        ->and($payload)->not->toHaveKey('icon')
        ->and($payload)->not->toHaveKey('actions');
});

it('carries the payload into the database notification carrier', function () {
    $carrier = Notification::make()->title('Hi')->body('there')->toDatabaseNotification();

    expect($carrier->via(new stdClass))->toBe(['database'])
        ->and($carrier->toArray(new stdClass))->toBe(['title' => 'Hi', 'body' => 'there']);
});
