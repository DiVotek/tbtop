# Upgrade guide

What to change in a host when moving to a new minor (a new major from 1.0).
Patches never need a step here. The rules behind it: [VERSIONING.md](VERSIONING.md).

Before upgrading, read the host's `deprecations` log channel: every deprecated
call it lists is a candidate for removal in the next minor.

Each breaking change gets a `###` entry under its release's heading, in the PR
that makes the change. The release tooling refuses a breaking release whose
heading has none.

## 0.7 → 0.8

0.8.0 is the first release under this policy.

### Laravel 11 is no longer supported

`tbtop/admin` now requires `illuminate/contracts ^12.0||^13.0`. Upgrade the host to
Laravel 12 or 13 before `composer update tbtop/admin`. Composer refuses the update on
Laravel 11. PHP stays `^8.4`.

### `displayHtml()` is sanitized by default

`$s->displayHtml($html)` now runs the HTML through `symfony/html-sanitizer` (W3C safe
baseline) on the server. Dropped: `<script>`, `<iframe>`, `<style>`, inline SVG, event
handlers (`on*`), `class`, `style` and `data-*` attributes, `javascript:` URLs. Kept: ordinary
text markup, tables, images, links with http(s)/mailto/tel or relative URLs,
`target`/`rel` on links. Images only from http(s) or relative URLs (no `data:`). Input over 1 MB is truncated before sanitizing.

If a page renders author-owned markup that relies on dropped parts (inline SVG icons,
`class`/`style` styling, embeds), opt out on that block:

```php
$s->displayHtml($html)->trusted();
```

Only call `trusted()` on markup the author controls. Never on record data.

`markdown()` is unchanged (it already stripped embedded HTML unless `->allowHtml()`).

### `meta.disabled` is always a boolean

`disabled()` now exists on every builder that carries meta and accepts a Closure
(`->disabled(fn () => ! $user->isAdmin())`). The value on the wire is cast to a
boolean, so `meta('disabled', 0)` now serializes as `false` and `meta('disabled', 'yes')`
as `true`. A client block that read a non-boolean `meta.disabled` gets a boolean instead.
Nothing changes for `disabled()` / `disabled(false)` or `meta('disabled', true)`.

### MCP `search` returns a short index; form values are opt-in

A bare `search()` call now returns an index (pages, executable ids with kind and label,
table names) instead of every form. `search` with a `page` lists the forms but sends their
current `values` only when the call passes `values: true`. An MCP client that read form
values from the bare search must call `search({ page, values: true })` instead.
Nothing changes for a host's PHP code.
