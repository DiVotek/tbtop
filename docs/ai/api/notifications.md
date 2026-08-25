<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Notifications

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Database notifications surfaced in the admin bell. Backed by Laravel's `database` channel — the payload is page-independent, so actions are links only, never server closures.

## Notification

`Tbtop\Admin\Notifications\Notification`

| Method | What it does |
|---|---|
| `actions(array $actions): self` | Links only — never a server closure. The payload is frozen into `notifications.data` and rendered independent of any page or request, so there's no endpoint left to resolve a closure against. |
| `body(string $body): self` | Optional supporting text shown under the title. |
| `color(string $color): self` | Semantic color token: success/warning/danger/info or a registered custom. |
| `danger(): self` | Sugar for status('danger'). |
| `icon(string $icon): self` | Lucide icon name (client icon registry); overrides the status default. |
| `info(): self` | Sugar for status('info'). |
| `sendToDatabase(mixed $notifiables): void` | Send to one or more notifiables now via the `database` channel. |
| `status(string $status): self` | Semantic status, set via color() under the hood. success()/warning()/danger()/info() are sugar calling this with a fixed value. |
| `success(): self` | Sugar for status('success'). |
| `title(string $title): self` | The only field always present on the wire payload; every other setter is optional. |
| `warning(): self` | Sugar for status('warning'). |

## NotificationAction

`Tbtop\Admin\Notifications\NotificationAction`

| Method | What it does |
|---|---|
| `openInNewTab(bool $newTab = true): self` | Open the link in a new browser tab instead of navigating in place. |
| `url(string $url): self` | Target URL the action link navigates to. |
