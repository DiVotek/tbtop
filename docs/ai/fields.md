# Field Inventory

> Back to [./README.md](./README.md)

Check here before building any field. The inventory is **22 PHP builders** (each a
1:1 wire `kind` → client component) plus **3 client-only kinds** (`time`, `json`,
`unknown`) that have no PHP builder by design — **25 client kinds total**. The
canonical 1:1 mapping lives in [Canonical field-kind inventory](#canonical-field-kind-inventory-php--client--schema)
below; treat it as the source of truth and add to it (never fork it) when a kind lands.

**The three-part rule (from [CLAUDE.md](../../CLAUDE.md)):** adding a new field type
requires ALL three pieces in the same change: a PHP builder class in
`packages/php/src/Dsl/Fields/`, a client component registered in
`packages/client/src/`, and a schema entry in `packages/contracts/`. Two out of three
is a broken wire contract. See [./wiring.md](./wiring.md) for the contract gate.

---

## Base fluent methods (all fields)

Every field class extends `Field.php`. These methods are available on every field.

| Method | Signature | What it does |
|---|---|---|
| `label` | `label(string $label): static` | Human-readable field label shown above the input |
| `helperText` | `helperText(string $text): static` | Muted hint text below the input, above any error |
| `tooltip` | `tooltip(string $text): static` | Info-icon popover text next to the label |
| `required` | `required(): static` | Marks the field required (adds `required` Laravel rule automatically) |
| `rules` | `rules(string\|array $rules): static` | Appends Laravel validation rules; pipe-string or array. **Pass regex as an array** — the pipe separator would be split |
| `rulesForLocale` | `rulesForLocale(string $locale, string\|array $rules): static` | Per-locale validation rules (for translatable fields) |
| `translatable` | `translatable(bool $value = true): static` | Marks the field as translatable; enables locale-tab UI |
| `default` | `default(mixed $value): static` | Sets the form default value |
| `set` | `set(string $key, mixed $value): static` | Escape hatch — writes an arbitrary option key to the wire node |
| `meta` | `meta(string $key, mixed $value): static` | Writes to the meta bag (client-side, not serialized in `opts`) |
| `filterUsing` | `filterUsing(callable $fn): static` | Server-only filter closure `fn($query, $value) => $query`; never sent to the wire |
| `hiddenIf` | `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Hides the field when a condition is met (client-evaluated) |
| `disabledIf` | `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Disables the field when a condition is met (client-evaluated) |

> **Validation is always PHP.** The client renders zod constraints for on-blur UX
> feedback only — they are never trusted as the security boundary. All rules live in
> the PHP DSL and are enforced server-side.

---

## Field inventory

One row per field. "Field-specific methods" are those beyond the base class above.

`$s->kind('name')` is the magic `__call` shorthand; `KindClass::make('name')` is the
equivalent static factory. The only exception is `inFilter`, which is a concrete method
on `S` (not magic dispatch). `FieldKindParityTest` guards this equivalence — it checks PHP
factory ↔ PHP magic dispatch **and** that `S::BUILT_IN_KINDS` equals the registered
`kindMap()` keys. Despite the "parity" name it does **not** compare PHP to the client; that
mapping is the [canonical inventory](#canonical-field-kind-inventory-php--client--schema) plus
the `KitchenSinkPage`/`ContractTest` gate.

| Field | `S` factory | Wire `kind` | Field-specific methods | Needs server endpoint? |
|---|---|---|---|---|
| **Text** | `$s->text('x')` / `Text::make('x')` | `text` | none | No |
| **Textarea** | `$s->textarea('x')` / `Textarea::make('x')` | `textarea` | none | No |
| **Password** | `$s->password('x')` / `Password::make('x')` | `password` | none | No |
| **OTP** | `$s->otp('x')` / `Otp::make('x')` | `otp` | `length(int $digits = 6)` — number of code slots; `pattern(string $regex)` — accepted-character regex (defaults to digits-only) | No |
| **Number** | `$s->number('x')` / `Number::make('x')` | `number` | none (use `->set('min', ...)`, `->set('step', ...)` via base `set`) | No |
| **Date** | `$s->date('x')` / `Date::make('x')` | `date` | none | No |
| **Datetime** | `$s->datetime('x')` / `Datetime::make('x')` | `datetime` | none | No |
| **Date range** | `$s->daterange('x')` / `Daterange::make('x')` | `daterange` | none; value shape: `{from?: string, to?: string}` | No |
| **Boolean** | `$s->boolean('x')` / `Boolean::make('x')` | `boolean` | none | No |
| **Checkbox** | `$s->checkbox('x')` / `Checkbox::make('x')` | `checkbox` | none | No |
| **Radio** | `$s->radio('x')` / `Radio::make('x')` | `radio` | `options(list<{value, label}> $options)` — static option list | No |
| **Select** | `$s->select('x')` / `Select::make('x')` | `select` | `options(array)`, `searchable(bool)`, `query(callable)` (async), `creatable(array $fields, callable $using)`, `multiple(bool)` — multi-value selection rendered as a searchable combobox with chips; when `creatable()` is set and the typed query has no exact match a "Create" row appears inline | `query()` → async-select endpoint; `creatable()` → select-create endpoint. See [./wiring.md](./wiring.md) |
| **Tags** | `$s->tags('x')` / `Tags::make('x')` | `tags` | none; multi-value string array | No |
| **Colorpicker** | `$s->colorpicker('x')` / `Colorpicker::make('x')` | `colorpicker` | none | No |
| **Key-value** | `$s->keyvalue('x')` / `Keyvalue::make('x')` | `keyvalue` | none; value shape: `Record<string, string>` | No |
| **Slug** | `$s->slug('x')` / `Slug::make('x')` | `slug` | `fromField(string $fieldName)` — source field that drives auto-generation | No |
| **Upload** | `$s->upload('x')` / `Upload::make('x')` | `upload` | `accept(string $accept)` — MIME types/extensions e.g. `'image/*'`; `disk(string $disk)` — Laravel filesystem disk (default `'public'`) | Upload endpoint (JSON, not Inertia) — see [./wiring.md](./wiring.md) |
| **Media picker** | `$s->media('x')` / `MediaPicker::make('x')` | `media` | `multiple(bool)` — allow selecting more than one; `accept(list<string> $mimes)` — filter visible/uploadable types | Media-library endpoint — see [./wiring.md](./wiring.md) |
| **Relation** | `$s->relation('x')` / `Relation::make('x')` | `relation` | `query(callable)` — Eloquent query builder for related records; `labelKey(string $column)` — display column (default `'name'`); `searchable(bool)` | Yes — relation-search endpoint. See [./wiring.md](./wiring.md) |
| **Repeater** | `$s->repeater('x')` / `Repeater::make('x')` | `repeater` | `fields(list<Field> $fields)` — child field list; `maxItems(int $max)` — item cap | No |
| **Richtext** | `$s->richtext('x')` / `Richtext::make('x')` | `richtext` | `placeholder(string $text)` | No |
| **In filter** | `$s->inFilter('x')` / `InFilter::make('x')` | `in` | `options(list<{value, label}> $options)` — fixed option list. **Filter context only** — use in `table()->filters()`, not in forms | No |

### Client component mapping

| Wire `kind` | Client component file |
|---|---|
| `text` | `fields/textField.tsx` |
| `textarea` | `fields/textareaField.tsx` |
| `password` | `fields/passwordField.tsx` |
| `otp` | `fields/otpField.tsx` |
| `number` | `fields/numberField.tsx` |
| `date` | `fields/dateField.tsx` |
| `datetime` | `fields/dateField.tsx` (DateTimeForm/DateTimeCell) |
| `daterange` | `fields/daterangeField.tsx` |
| `boolean` | `fields/booleanField.tsx` |
| `checkbox` | `fields/checkboxField.tsx` |
| `radio` | `fields/radioField.tsx` |
| `select` | `fields/selectField.tsx` |
| `tags` | `fields/tagsField.tsx` |
| `in` | `fields/tagsField.tsx` (reused for filter rendering) |
| `colorpicker` | `fields/colorpickerField.tsx` |
| `keyvalue` | `fields/keyvalueField.tsx` |
| `slug` | `fields/slugField.tsx` |
| `upload` | `fields/uploadField.tsx` |
| `media` | `media/mediaPickerField.tsx` (lives outside `fields/`) |
| `relation` | `fields/relationField.tsx` |
| `repeater` | `fields/repeaterField.tsx` |
| `richtext` | `fields/richtext/` (lazy-loaded; Lexical editor) |

---

## Canonical field-kind inventory (PHP ↔ client ↔ schema)

This is the **source-of-truth mapping**. Every built-in field is 1:1 across all three
surfaces: one PHP builder → one wire `kind` → one client `defineFieldClient` call. There
are **zero** one-PHP-to-many-client cases — `select` is a single clean kind that branches
at runtime (static / searchable / async / creatable / multi) inside `SelectForm`, not a
family of kinds.

**Counts:** 22 PHP builders → 22 wire kinds → 22 client kinds, **plus** 3 client-only kinds
(see below) = **25 client `defineFieldClient` registrations** total.

The PHP side keeps two parallel lists that must agree: `S::BUILT_IN_KINDS` (the public
identifier list, used by test datasets) and the bootstrapped `S::kindMap()` (kind → builder
class). `FieldKindParityTest` asserts they are the same set, so a kind added to one but not
the other fails CI. Add a kind → append to **both** PHP lists, the inventory table below, the
client `registerBuiltins.ts`, and exercise it in `KitchenSinkPage` (the contract gate). Rows
are in `BUILT_IN_KINDS` order; **append new rows at the end**, do not reorder existing ones.

| # | PHP builder | `S` factory | Wire `kind` | Client kind | Client file |
|---|---|---|---|---|---|
| 1 | `Text` | `$s->text('x')` | `text` | `text` | `fields/textField.tsx` |
| 2 | `Textarea` | `$s->textarea('x')` | `textarea` | `textarea` | `fields/textareaField.tsx` |
| 3 | `Password` | `$s->password('x')` | `password` | `password` | `fields/passwordField.tsx` |
| 4 | `Otp` | `$s->otp('x')` | `otp` | `otp` | `fields/otpField.tsx` |
| 5 | `Number` | `$s->number('x')` | `number` | `number` | `fields/numberField.tsx` |
| 6 | `Date` | `$s->date('x')` | `date` | `date` | `fields/dateField.tsx` (`DateForm`/`DateCell`) |
| 7 | `Datetime` | `$s->datetime('x')` | `datetime` | `datetime` | `fields/dateField.tsx` (`DateTimeForm`/`DateTimeCell`) |
| 8 | `Boolean` | `$s->boolean('x')` | `boolean` | `boolean` | `fields/booleanField.tsx` |
| 9 | `Select` | `$s->select('x')` | `select` | `select` | `fields/selectField.tsx` (branches static/async/creatable/multi at runtime) |
| 10 | `Radio` | `$s->radio('x')` | `radio` | `radio` | `fields/radioField.tsx` |
| 11 | `Tags` | `$s->tags('x')` | `tags` | `tags` | `fields/tagsField.tsx` |
| 12 | `InFilter` | `$s->inFilter('x')` | `in` | `in` | `fields/tagsField.tsx` (reused; `TagsForm`/`TagsCell`) |
| 13 | `Checkbox` | `$s->checkbox('x')` | `checkbox` | `checkbox` | `fields/checkboxField.tsx` |
| 14 | `Colorpicker` | `$s->colorpicker('x')` | `colorpicker` | `colorpicker` | `fields/colorpickerField.tsx` |
| 15 | `Keyvalue` | `$s->keyvalue('x')` | `keyvalue` | `keyvalue` | `fields/keyvalueField.tsx` |
| 16 | `Slug` | `$s->slug('x')` | `slug` | `slug` | `fields/slugField.tsx` |
| 17 | `Upload` | `$s->upload('x')` | `upload` | `upload` | `fields/uploadField.tsx` |
| 18 | `MediaPicker` | `$s->media('x')` | `media` | `media` | `media/mediaPickerField.tsx` (outside `fields/`) |
| 19 | `Relation` | `$s->relation('x')` | `relation` | `relation` | `fields/relationField.tsx` |
| 20 | `Repeater` | `$s->repeater('x')` | `repeater` | `repeater` | `fields/repeaterField.tsx` |
| 21 | `Richtext` | `$s->richtext('x')` | `richtext` | `richtext` | `fields/richtext/` (lazy; Lexical) |
| 22 | `Daterange` | `$s->daterange('x')` | `daterange` | `daterange` | `fields/daterangeField.tsx` |
<!-- M-89 and later: append new built-in kinds below this line, in BUILT_IN_KINDS order. -->

> `inFilter` is the one factory that is a concrete method on `S`, not magic `__call`
> dispatch — but it still maps 1:1 to wire kind `in` and the client `in` registration.

### Client-only kinds (intentional asymmetry)

These three wire kinds are registered on the client (`registerBuiltins.ts`) with **no PHP
builder** — deliberately. They are not drift to "fix" by adding a builder; a builder is a new
field type and must go through the contract gate (schema + kitchen-sink + contract test) in
its own change.

| Wire `kind` | Client file | Why no PHP builder |
|---|---|---|
| `time` | `fields/dateField.tsx` (`TimeForm`, cell reuses `DateCell`) | The renderer exists ahead of a `Time` DSL builder. Until a builder lands, emit it from a consumer via `S::register('time', …)`. Adding the builder is a follow-up (contract-gated), not a doc fix. |
| `json` | `fields/jsonField.tsx` | Escape-hatch renderer for raw JSON values. Intended to be bound per-app via `S::register('json', …)` against a consumer field class — no core builder by design. |
| `unknown` | `fields/unknownField.tsx` | Render-time fallback for any `kind` the client does not recognize. It is the safety net, never something an author selects — so it has no builder and never will. |

**Binding a client-only kind from a consumer app** (no core edit): register a PHP field class
for the kind so the DSL can author it, while the matching client renderer already exists.

```php
// In the consumer app (e.g. a service-provider boot), NOT in the package.
use Tbtop\Admin\Dsl\S;

S::register('time', \App\Admin\Fields\TimeField::class); // TimeField extends Tbtop\Admin\Dsl\Fields\Field
// Authors can then write $s->time('opens_at') and the client's `time` renderer handles it.
```

`S::register($kind, $fieldClass)` requires `$fieldClass` to extend
`Tbtop\Admin\Dsl\Fields\Field`; it adds (or overrides) the entry in `kindMap()` for that
request. App-specific *client* renderers use `defineFieldClient` — see
[Custom fields](#custom-fields-app-specific).

### No closed kind enum — by design

There is **no enum of field kinds** in `structure.schema.json` or the client zod grammar:
the schema types `kind` as an open `string` (`{ "type": "string", "minLength": 1 }`), and the
zod mirror is equally open. This is intentional — `S::register` / `defineFieldClient` let a
consumer add kinds without editing the package, which a closed enum would forbid. **Do not
"tighten" the schema by enumerating kinds.** The wire contract is enforced instead by
`KitchenSinkPage` emitting a representative tree that PHP validates against the schema and the
client renders (`ContractTest`) — coverage, not enumeration.

### Reactive / cascading selects — unsupported

A `select` whose options depend on another field's value (cascading / `dependsOn`) is **not
supported**. `Select.php` has no `dependsOn`, and the client async path keys only on the typed
search string — there is no field-dependency channel on the wire. Do not assume it works;
filing a builder for it is a separate, contract-gated change.

---

## Fields that need a server endpoint

Three fields resolve data from the server at runtime rather than from static props.

### Relation — `relation-search` endpoint

`Relation` always requires a `query()` closure on the PHP builder. The client sends
a search string; the endpoint runs the closure, filters by the search term, and returns
matching records. The `labelKey` method sets which column is used as the display label
(defaults to `'name'`).

```php
// From apps/demo/app/Admin/Pages/RelationDemoPage.php
$s->relation('author_id')->label('Author')
    ->query(fn () => User::query()->orderBy('name'))
    ->labelKey('name')
    ->searchable()
    ->rules('nullable|exists:users,id'),
```

See [./wiring.md](./wiring.md) for the endpoint request/response shape.

> The relation field ships full async type-ahead (server search endpoint + client
> combobox) as of PR #2. `CLAUDE.md`'s "plain input" stub note predates that and is
> stale — the field is fully wired.

### Select with `creatable()` — `select-create` endpoint

When `creatable(array $fields, callable $using)` is called, the client shows a
mini-form inside the select dropdown. Submitting it hits the select-create endpoint,
which runs the `$using` closure server-side and returns the new option's `{value, label}`.

```php
// From apps/demo/app/Admin/Pages/Concerns/PostFormFields.php
$s->select('author_id')->label('Author')
    ->searchable()
    ->creatable(
        fields: [
            $s->text('name')->label('Name')->required(),
        ],
        using: function (array $validated): array {
            $user = User::create([...]);
            return ['value' => (string) $user->id, 'label' => $user->name];
        },
    ),
```

See [./wiring.md](./wiring.md) for the endpoint shape.

### Select with `query()` — async-select endpoint

When `query(callable)` is passed instead of `options(array)`, the select fetches its
options from the server on open/search rather than reading from static props.

See [./wiring.md](./wiring.md) for the endpoint shape.

---

## Custom fields (app-specific)

Do not edit `packages/php/src/Dsl/Fields/` or `packages/client/src/fields/` to add an
app-specific field. Use the client registry (`registerBlock` / `defineFieldClient`) and
a matching PHP field class in the consumer app instead. See [./wiring.md](./wiring.md)
for the registration pattern; the demo's `Rating` field in
`apps/demo/resources/js/admin.tsx` is the canonical example.
