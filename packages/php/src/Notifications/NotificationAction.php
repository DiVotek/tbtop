<?php

namespace Tbtop\Admin\Notifications;

use JsonSerializable;

/**
 * A single navigable action on a database notification — a link, never a
 * server closure. Notifications are page-independent (the same constraint as
 * chrome): they have no action endpoint to resolve a handler against, and the
 * stored payload must be a durable primitive snapshot. So an action is a
 * label + URL, frozen into the notification's `data` column at send-time and
 * rendered as a link by the client.
 */
final class NotificationAction implements JsonSerializable
{
    private string $url = '';

    private bool $newTab = false;

    private function __construct(private readonly string $label) {}

    public static function make(string $label): self
    {
        return new self($label);
    }

    public function url(string $url): self
    {
        $this->url = $url;

        return $this;
    }

    public function openInNewTab(bool $newTab = true): self
    {
        $this->newTab = $newTab;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        $out = ['label' => $this->label, 'url' => $this->url];
        if ($this->newTab) {
            $out['newTab'] = true;
        }

        return $out;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
