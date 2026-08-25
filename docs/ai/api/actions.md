<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Actions and effects

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Action authoring and the closed effect vocabulary an action handler returns.

## ActionBuilder

`Tbtop\Admin\Dsl\ActionBuilder`

| Method | What it does |
|---|---|
| `authorize(string $ability, mixed $arg = null): self` | Gate check (Gate::allows($ability, $arg)). A failing check drops the action from the wire, the way Filament auto-hides — and the same check is re-run authoritatively when the action fires, so a hidden action cannot be triggered by hand-crafting the request. |
| `badge(string\|int $count, ?Color $color = null): self` | Count badge after the label. Pass a Color for the badge tint. |
| `button(): self` | Render the trigger styled as a button (the default). |
| `color(string $color): self` | Visual color/tint of the trigger (e.g. 'danger' for a destructive action). |
| `confirm(string $title, ?string $description = null): self` | Adds a confirmation dialog before the action fires. Composes with any spec (visit/submit/handle/modal/custom) — unlike those, it is not itself a spec and doesn't participate in the "exactly one" exclusivity. |
| `custom(string $handler, array $params = []): self` | Custom spec: one of the mutually exclusive action specs. Dispatches to a client-side handler registered via defineCustomAction($handler, ...) — $params is passed through unchanged. A $handler name with no registered handler throws client-side when the action fires, not at page load. |
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `handle(Closure $handler, array $needs = []): self` | Server spec: one of the mutually exclusive action specs. $handler runs server-side and must return an Effects instance (see Actions\Effects) — a non-Effects return is treated as no effects. $needs declares which payload sources are collected and passed to $handler: 'form' (validated field values), 'row' (the record for a row action), 'selection' (checked row keys for a bulk action). |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `keybinding(string $keys): self` | Keyboard shortcut that triggers the action (e.g. 'mod+s'). |
| `label(string $label): self` | Button/link text. |
| `link(): self` | Render the trigger styled as a link. |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |
| `modal(string $title, Node\|FormBuilder\|JsonSerializable\|null $body = null, ?string $description = null): self` | Modal spec: one of the mutually exclusive action specs (visit/submit/ handle/modal/custom) — calling a second spec method on the same action throws. $body renders inside the dialog; pass a FormBuilder to collect input, or omit it for a plain content/confirmation modal. |
| `modalWidth(string $width): self` | Set the modal dialog width. Only valid on modal actions. |
| `outlined(bool $outlined = true): self` | Render the trigger as an outlined button. |
| `query(callable $fn, array $needs = ['row']): static` | Optional data source for a modal action: runs server-side when the modal opens, receives the row/selection context, and returns data fed to the modal body (e.g. a record to prefill a form). Not needed for a modal that only collects input — CreateAction has none; EditAction uses it to load the record. |
| `size(string $size): self` | Set the trigger button size. |
| `slideOver(bool $slideOver = true): self` | Render the modal as a right-anchored, full-height slide-over panel. |
| `submit(?string $form = null): self` | Submit spec: one of the mutually exclusive action specs (visit/submit/ handle/modal/custom) — setting a second one throws. With $form omitted, submits the form the action is rendered inside; pass a form name to target a different form on the same page. |
| `tooltip(string $text): static` | Tooltip text shown on hover. |
| `visit(string $href, bool $newTab = false): self` | Visit spec: navigates to $href on click, one of the mutually exclusive action specs. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |
| `withoutValidation(bool $without = true): self` | Turn the enclosing form's rules from a gate into a schema filter for this action: the handler still receives only declared keys, but a field that fails its rules no longer blocks the action. Lets a form-scoped action (add a block, delete a row) run while the form is half-filled. Silently ignored on anything that is not a `handle()` with `'form'` in its needs — there is nothing to opt out of there. |

## Effects

`Tbtop\Admin\Actions\Effects`

| Method | What it does |
|---|---|
| `closeModal(): self` | Closes the modal the action ran in; a no-op outside a modal action. |
| `copyToClipboard(string $text): self` | Client writes $text to the clipboard and shows a success notify. |
| `haltModal(string $message, string $kind = 'error'): self` | Surfaces $message inside the still-open modal; does NOT close it. |
| `notify(string $message, string $kind = 'success'): self` | Toast the message. Only 'error' and 'warning' have their own styling — every other value, including an unrecognized one, renders as success. Note the failure level is 'error', not 'danger' (which is the *button* color vocabulary and would silently toast green here). |
| `redirect(string $href): self` | Client-side navigation via the Inertia router — not an HTTP redirect response from the controller. |
| `refreshTable(?string $table = null): self` | Refetches the named table, or without a name: the table enclosing this action if any, else every table mounted on the page, else a full page reload if none are mounted. |
| `resetForm(?string $form = null): self` | Resets the nearest enclosing form; the client ignores $form's value and always targets that form. |
| `setFormData(array $data): self` | Replaces each key's value in the nearest enclosing form, leaving it mounted and dirty. resetForm overwrites this — order setFormData last. |

## FormBuilder

`Tbtop\Admin\Dsl\FormBuilder`

| Method | What it does |
|---|---|
| `guardUnsaved(bool $enabled): self` | Per-form override for the unsaved-changes navigation guard. |
| `onSubmit(Closure $handler): self` | Server-side handler run after validation passes, never serialized. It receives an ActionCtx (validated input at $ctx->form, plus user, request and route params) — not a bare array. Return an Effects instance, or a string to redirect there. |
| `record(array $record): self` | Seeds initial form data (lands in page props). Explicit keys here win over a field's own default() — RecordDefaults only fills in keys absent from $record, so record(['x' => null]) keeps the explicit null instead of the field default. A scalar value for a translatable field is expanded into a per-locale map (see TranslatableRecord::normalize), with the scalar assigned to the default content locale. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |
