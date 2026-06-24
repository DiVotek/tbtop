<?php

namespace Tbtop\Admin\Notifications;

use Illuminate\Notifications\Notification as LaravelNotification;

/**
 * Laravel notification that carries a built payload to the `database`
 * channel. Created by {@see Notification::sendToDatabase()} /
 * {@see Notification::toDatabaseNotification()} — not constructed directly.
 * Delivery (queue, table, channel) is entirely Laravel's; this only ships
 * the payload array the bell renders.
 */
final class DatabaseNotification extends LaravelNotification
{
    /** @param  array<string, mixed>  $payload */
    public function __construct(private readonly array $payload) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return $this->payload;
    }
}
