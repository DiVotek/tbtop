<?php

namespace Tbtop\Admin\Notifications;

use Illuminate\Support\Facades\Notification as NotificationFacade;

/**
 * Filament-shaped builder for a database notification. Produces the JSON
 * payload stored in Laravel's `notifications.data` column and rendered by the
 * header bell; delivery is plain Laravel (the `database` channel via the
 * carrier {@see DatabaseNotification}). This class owns only the wire shape —
 * not the queue, the channel, or the table.
 *
 *     Notification::make()
 *         ->title('Booking confirmed')
 *         ->body('Car #42 booked for Jun 24')
 *         ->success()
 *         ->actions([NotificationAction::make('View')->url('/admin/bookings/42')])
 *         ->sendToDatabase($admin);
 */
final class Notification
{
    private string $title = '';

    private ?string $body = null;

    private ?string $icon = null;

    private ?string $color = null;

    /** @var list<NotificationAction> */
    private array $actions = [];

    public static function make(): self
    {
        return new self;
    }

    /** The only field always present on the wire payload; every other setter is optional. */
    public function title(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    /** Optional supporting text shown under the title. */
    public function body(string $body): self
    {
        $this->body = $body;

        return $this;
    }

    /** Lucide icon name (client icon registry); overrides the status default. */
    public function icon(string $icon): self
    {
        $this->icon = $icon;

        return $this;
    }

    /** Semantic color token: success/warning/danger/info or a registered custom. */
    public function color(string $color): self
    {
        $this->color = $color;

        return $this;
    }

    /** Semantic status, set via color() under the hood. success()/warning()/danger()/info() are sugar calling this with a fixed value. */
    public function status(string $status): self
    {
        return $this->color($status);
    }

    /** Sugar for status('success'). */
    public function success(): self
    {
        return $this->status('success');
    }

    /** Sugar for status('warning'). */
    public function warning(): self
    {
        return $this->status('warning');
    }

    /** Sugar for status('danger'). */
    public function danger(): self
    {
        return $this->status('danger');
    }

    /** Sugar for status('info'). */
    public function info(): self
    {
        return $this->status('info');
    }

    /**
     * Links only — never a server closure. The payload is frozen into
     * `notifications.data` and rendered independent of any page or request,
     * so there's no endpoint left to resolve a closure against.
     *
     * @param  list<NotificationAction>  $actions
     */
    public function actions(array $actions): self
    {
        $this->actions = $actions;

        return $this;
    }

    /**
     * The payload frozen into `notifications.data`, sparse: only title is
     * always present.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $out = ['title' => $this->title];
        if ($this->body !== null) {
            $out['body'] = $this->body;
        }
        if ($this->icon !== null) {
            $out['icon'] = $this->icon;
        }
        if ($this->color !== null) {
            $out['color'] = $this->color;
        }
        if ($this->actions !== []) {
            $out['actions'] = array_map(
                static fn (NotificationAction $action): array => $action->toArray(),
                $this->actions,
            );
        }

        return $out;
    }

    /**
     * Send to one or more notifiables now via the `database` channel.
     *
     * @param  mixed  $notifiables  a notifiable model, collection, or array
     */
    public function sendToDatabase(mixed $notifiables): void
    {
        NotificationFacade::send($notifiables, $this->toDatabaseNotification());
    }

    /** The carrier notification, for `$user->notify()` or queue control. */
    public function toDatabaseNotification(): DatabaseNotification
    {
        return new DatabaseNotification($this->toArray());
    }
}
