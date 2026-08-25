<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Display blocks, stats and charts

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Read-only content blocks plus the stat, chart, list and live-region builders. Layout blocks (`stack`/`grid`/`section`/`flex`) take option arrays rather than fluent methods and are documented in [authoring-pages.md](../authoring-pages.md#layout-blocks).

## TextBlock

`Tbtop\Admin\Dsl\TextBlock`

| Method | What it does |
|---|---|
| `variant(string $variant): self` | Typographic style applied to the rendered text. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## AlertBlock

`Tbtop\Admin\Dsl\AlertBlock`

| Method | What it does |
|---|---|
| `color(Color\|string $color): self` | Alert tint (e.g. info/success/warning/danger). Defaults to 'info'. |
| `title(?string $title): self` | Optional heading rendered above the message; pass null to clear it. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## MarkdownBlock

`Tbtop\Admin\Dsl\MarkdownBlock`

| Method | What it does |
|---|---|
| `allowHtml(): self` | Allow raw HTML in the markdown source to pass through unchanged. Use only for trusted, author-controlled content. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## DisplayValueBlock

`Tbtop\Admin\Dsl\DisplayValueBlock`

| Method | What it does |
|---|---|
| `badge(array $colors): self` | Ships the raw value plus its color map and lets the client render the badge — unlike date/money, nothing is baked server-side. An unmatched value still renders, in the default gray. |
| `boolean(?string $trueIcon = null, ?string $falseIcon = null, Color\|string\|null $trueColor = null, Color\|string\|null $falseColor = null): self` | Kind sugar: renders the value as a boolean icon (mirrors Column::boolean()); the raw value ships, the client renders the icon. |
| `copyable(string $copyMessage = 'Copied', int $copyMessageDuration = 2000): static` | Renders a copy-to-clipboard button next to the value. What lands on the clipboard is whatever reached the client, which is not always the stored value: server-formatted kinds (money/date/datetime/ number) and formatUsing() bake their output into the wire, so a money column copies "12.34 USD", not the cents. Kinds the client renders (badge/boolean/icon) and form fields copy the raw value. |
| `date(?string $format = null): self` | Formats server-side and bakes the string into the wire — no format meta ships. |
| `datetime(?string $format = null): self` | Formats server-side and bakes the string into the wire — no format meta ships. |
| `field(string $name): self` | Bind this block to a modal-data field by name (client resolves the raw value from useModalData() at render time, like a form field's `name`). Incompatible with baked kinds (date/datetime/number/money) since their formatting runs once at author time, before any live value exists. |
| `icon(array $map): self` | Ships the raw value plus its icon map and lets the client render the icon. An unmatched value falls back to plain text. |
| `money(string $currency): self` | Formats server-side and bakes the string into the wire. Takes minor units — the value is divided by 100, same as Column::money(). |
| `multiline(bool $enabled = true): self` | Renders the value with `whitespace-pre-line` client-side, so embedded newlines (e.g. a payload string baked as "key: value\nkey: value") render as line breaks instead of collapsing into one line. Independent of kind/field() — a plain-text concern, not a formatting one. |
| `number(?int $decimals = null): self` | Formats server-side and bakes the string into the wire — no format meta ships. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## DisplayImageBlock

`Tbtop\Admin\Dsl\DisplayImageBlock`

| Method | What it does |
|---|---|
| `alt(string $alt): self` | Accessible alt text for the rendered image. |
| `asLink(): self` | Render as a file-download link instead of an inline image. |
| `caption(string $caption): self` | Caption text rendered below the image/link. |
| `circular(): self` | Circular image shape. Last shape call wins. |
| `square(): self` | Square image shape (sharp corners). Last shape call wins. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## Stat

`Tbtop\Admin\Dsl\Stat`

| Method | What it does |
|---|---|
| `color(Color\|string $color): self` | Tint for the value/icon (a Color or a registered color token). |
| `delta(string $text, string $direction): self` | Change indicator (e.g. "+12%") rendered next to the value. $direction is 'up', 'down' or 'flat' and picks the arrow and tint. |
| `description(?string $description, ?string $color = null): self` | Sub-label under the value, optionally tinted to carry meaning ('success'/'warning'/'danger'); the default is muted text. |
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |
| `poll(int $seconds): self` | Poll the stat's data endpoint every $seconds, re-invoking the value closure on each tick instead of once at page render. The 5-second floor is enforced twice: below it this throws, and the client clamps whatever reaches it. Stamps options.source so the client fetches from the page data endpoint, keyed by this stat's label. |
| `sparkline(array $numbers, string $position = 'inline'): self` | Mini trend chart from a plain list of numbers — no axes or labels, so the series only has to be ordered, not scaled. |
| `sparklineColor(string $color): self` | Tint applied to the sparkline chart. |
| `tooltip(string $text): static` | Tooltip text shown on hover. |
| `trend(string $direction): self` | Small trend arrow rendered after the description, inheriting its color. |
| `value(mixed $value): self` | The headline number/text. Accepts a scalar or a Closure resolved server-side at render time (and on each poll() tick). |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## ChartBuilder

`Tbtop\Admin\Dsl\ChartBuilder`

| Method | What it does |
|---|---|
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |
| `params(array $fields): self` | Filter fields rendered above the chart (regular field builders, e.g. select('interval')->options([...])->default('month')). Their values reach the query() closure as $params['name']. Text-ish kinds debounce before refetching; every change costs one request, so keep the set small. |
| `poll(int $seconds): self` | Re-fetch the chart's data endpoint every $seconds. The 5-second floor is enforced twice: below it this throws, and the client clamps whatever reaches it. Only meaningful together with ->query(). |
| `query(callable $fn): static` | Makes the chart dynamic: data comes from the page data endpoint instead of $opts. $fn: fn(Request $request, array $params): array — $params holds the current values of the params() fields keyed by field name (empty array without params()). Return a list of flat rows (arrays or a query result) containing the xKey/nameKey column and every series dataKey, e.g. [['period' => '2026-08', 'count' => 12], ...]. |
| `set(string $key, mixed $value): self` | Escape hatch: writes $key directly into the serialized chart node options, bypassing any dedicated fluent method. Key names are NOT validated against the schema — a typo or unsupported key ships silently. Prefer a real fluent method when one exists. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## ListBuilder

`Tbtop\Admin\Dsl\ListBuilder`

| Method | What it does |
|---|---|
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `items(callable $fn): self` | Row source for the list. $fn runs server-side at serialization time (no request payload — same lazy-resolution shape as Stat::value) and returns each row as ['title' => ..., 'meta'?, 'color'?, 'url'?]; 'title' is required, 'color' is one of success\|warning\|danger\|muted. |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |

## LiveRegionBuilder

`Tbtop\Admin\Dsl\LiveRegionBuilder`

| Method | What it does |
|---|---|
| `dependsOn(array\|string $fields): self` | Declare the form field(s) whose value changes reload this region. Their current values reach the render closure as ['field' => value]. |
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |
| `render(callable $fn): self` | The region's content, re-rendered server-side each time a declared dependsOn() field changes (one round-trip per change). $fn receives only the dependsOn()-filtered deps, not the full form state, and must return display nodes only — no fields. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |
