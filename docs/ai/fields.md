# Field Inventory

> Back to [./README.md](./README.md)

Check here before building any field. The inventory is **25 PHP builders** (each a
1:1 wire `kind` → client component) plus **3 client-only kinds** (`time`, `json`,
`unknown`) that have no PHP builder by design — **28 client kinds total**. The
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
| `columnSpan` | `columnSpan(int\|array $span): static` | Grid column span inside a `grid`/`section(columns: ...)` parent: int (1-8) or a breakpoint object `{sm?, md?, lg?, xl?}` (each 1-8) |
| `columnStart` | `columnStart(int\|array $start): static` | Grid column start offset inside a `grid`/`section(columns: ...)` parent; same int-or-breakpoint-object shape as `columnSpan` |

> **Validation is always PHP.** The client renders zod constraints for on-blur UX
> feedback only — they are never trusted as the security boundary. All rules live in
> the PHP DSL and are enforced server-side.

---

## Fluent validation helpers

Filament-style fluent methods that wrap `rules()`. Each appends the same Laravel rule
a raw `->rules('...')` call would — they are **ergonomics, not new machinery**. Composed
per field via traits in `Dsl/Concerns/`, so a field only exposes the helpers that fit it
(a boolean has no `->minLength()`). `min`/`max` also surface as client wire constraints
(on-blur UX); the rest are server-only.

**Generic (`HasGenericRules`) — every field:**

| Method | Rule | Method | Rule |
|---|---|---|---|
| `nullable()` | `nullable` | `confirmed()` | `confirmed` |
| `same($field)` | `same:field` | `different($field)` | `different:field` |
| `requiredWith(...$f)` | `required_with:…` | `requiredWithout(...$f)` | `required_without:…` |
| `in($values)` | `in:…` | `notIn($values)` | `not_in:…` |

**String (`HasStringRules`) — text, textarea, password, slug:**

| Method | Rule | Method | Rule |
|---|---|---|---|
| `minLength($n)` | `min:n` | `maxLength($n)` | `max:n` |
| `length($n)` | `size:n` | `regex($pat)` | `regex:…` (auto array-wrapped) |
| `alpha()` | `alpha` | `alphaNum()` | `alpha_num` |
| `alphaDash()` | `alpha_dash` | `startsWith(...$v)` / `endsWith(...$v)` | `starts_with:` / `ends_with:` |

**Numeric (`HasNumericRules`) — number, slider:**

| Method | Rule | Note |
|---|---|---|
| `minValue($n)` / `maxValue($n)` | `numeric\|min:n` / `numeric\|max:n` | named `*Value` to avoid Slider's structural `min()`/`max()` |
| `between($a,$b)` | `numeric\|between:a,b` | paired with `numeric` so it reads as value range, not string length |
| `multipleOf($n)` / `integer()` / `numeric()` | `multiple_of:` / `integer` / `numeric` | |

**Database (`HasDatabaseRules`) — text, select, relation** (server-only):

```php
$s->text('email')->unique('users')                 // unique:users,email (column defaults to field name)
$s->text('email')->unique('users')->ignore($id)    // unique:users,email,{id},id  — skip the editing row
$s->relation('author_id')->exists('users', 'id')   // exists:users,id
```

> `ignore()` rewrites the last `unique` rule; call it **after** `unique()` or it throws.
> The ignore value is explicit (no auto edit-context) — pass the record's PK yourself.

See `apps/demo/app/Admin/Pages/ValidationRulesPage.php` for an end-to-end example.

---

## Field inventory

One row per field. "Field-specific methods" are those beyond the base class above.

`$s->kind('name')` is the magic `__call` shorthand; `KindClass::make('name')` is the
equivalent static factory. The only exception is `inFilter`, which is a concrete method
on `S` (not magic dispatch). `FieldKindParityTest` guards this equivalence — it checks PHP
factory ↔ PHP magic dispatch **and** that every `S::BUILT_IN_KINDS` entry is registered in
`kindMap()` (a subset check — the live map may also hold consumer kinds from `S::register`).
Despite the "parity" name it does **not** compare PHP to the client; that
mapping is the [canonical inventory](#canonical-field-kind-inventory-php--client--schema) plus
the `KitchenSinkPage`/`ContractTest` gate.

| Field | `S` factory | Wire `kind` | Field-specific methods | Needs server endpoint? |
|---|---|---|---|---|
| **Text** | `$s->text('x')` / `Text::make('x')` | `text` | `placeholder(string $text)` | No |
| **Textarea** | `$s->textarea('x')` / `Textarea::make('x')` | `textarea` | `placeholder(string $text)` | No |
| **Password** | `$s->password('x')` / `Password::make('x')` | `password` | none | No |
| **OTP** | `$s->otp('x')` / `Otp::make('x')` | `otp` | `length(int $digits = 6)` — code slots **and** a `digits:N` rule (UI + backend agree); `pattern(string $regex)` — accepted-character regex (defaults to digits-only) | No |
| **Number** | `$s->number('x')` / `Number::make('x')` | `number` | `placeholder(string $text)` (also `->set('min', ...)`, `->set('step', ...)` via base `set`) | No |
| **Date** | `$s->date('x')` / `Date::make('x')` | `date` | none | No |
| **Datetime** | `$s->datetime('x')` / `Datetime::make('x')` | `datetime` | none | No |
| **Date range** | `$s->daterange('x')` / `Daterange::make('x')` | `daterange` | none; value shape: `{from?: string, to?: string}` | No |
| **Boolean** | `$s->boolean('x')` / `Boolean::make('x')` | `boolean` | none | No |
| **Checkbox** | `$s->checkbox('x')` / `Checkbox::make('x')` | `checkbox` | none | No |
| **Radio** | `$s->radio('x')` / `Radio::make('x')` | `radio` | `options(list<{value, label, description?, disabled?}> $options)` — static option list, each option can carry its own `description` and `disabled`; `inline(bool $value = true)` — horizontal layout instead of the default stacked list; `boolean()` — shorthand for a 2-option Yes/No radio, no-op if `options()` was already called | No |
| **Select** | `$s->select('x')` / `Select::make('x')` | `select` | `options(array)`, `searchable(bool)`, `query(callable)` (async), `creatable(array $fields, callable $using)`, `multiple(bool)` — multi-value selection rendered as a searchable combobox with chips; when `creatable()` is set and the typed query has no exact match a "Create" row appears inline | `query()` → async-select endpoint; `creatable()` → select-create endpoint. See [./wiring.md](./wiring.md) |
| **Tags** | `$s->tags('x')` / `Tags::make('x')` | `tags` | none; multi-value string array | No |
| **Colorpicker** | `$s->colorpicker('x')` / `Colorpicker::make('x')` | `colorpicker` | none | No |
| **Key-value** | `$s->keyvalue('x')` / `Keyvalue::make('x')` | `keyvalue` | none; value shape: `Record<string, string>` | No |
| **Slug** | `$s->slug('x')` / `Slug::make('x')` | `slug` | `fromField(string $fieldName)` — source field that drives auto-generation | No |
| **Upload** | `$s->upload('x')` / `Upload::make('x')` | `upload` | `accept(string\|list<string> $accept)` — MIME types/extensions e.g. `'image/*'` or `['application/pdf', 'image/*']`; `disk(string $disk)` — Laravel filesystem disk (default `'public'`) | Upload endpoint (JSON, not Inertia) — see [./wiring.md](./wiring.md) |
| **Media picker** | `$s->media('x')` / `MediaPicker::make('x')` | `media` | `multiple(bool)` — allow selecting more than one; `accept(list<string> $mimes)` — filter visible/uploadable types; `variant('inline'\|'preview')` — single-select display: 'inline' (default) is a Choose button with a read-only filename field, 'preview' is a fully clickable preview block (dashed placeholder when empty, large image/typed file card when filled); multiple mode always renders preview chips regardless of variant | Media-library endpoint — see [./wiring.md](./wiring.md) |
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

**Counts:** 25 PHP builders → 25 wire kinds → 25 client kinds, **plus** 3 client-only kinds
(see below) = **28 client `defineFieldClient` registrations** total.

The PHP side keeps two parallel lists that must agree: `S::BUILT_IN_KINDS` (the public
identifier list, used by test datasets) and the bootstrapped `S::kindMap()` (kind → builder
class). `FieldKindParityTest` asserts every `BUILT_IN_KINDS` entry is registered in `kindMap()`,
so a built-in present in the list but missing from the map fails CI. Add a kind → append to
**both** PHP lists (keep them in sync), the inventory table below, the
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
| 23 | `CheckboxList` | `$s->checkboxlist('x')` | `checkboxlist` | `checkboxlist` | `fields/checkboxListField.tsx` |
| 24 | `ToggleButtons` | `$s->togglebuttons('x')` | `togglebuttons` | `togglebuttons` | `fields/toggleButtonsField.tsx` |
| 25 | `Slider` | `$s->slider('x')` | `slider` | `slider` | `fields/sliderField.tsx` |
<!-- M-90 and later: append new built-in kinds below this line, in BUILT_IN_KINDS order. -->

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

## M-89 fields — CheckboxList, ToggleButtons, Slider

Three controls added in M-89. All three are exercised end-to-end in
`apps/demo/app/Admin/Pages/NewFeaturesPage.php` — every snippet below is copied from it.

| Field | `S` factory | Wire `kind` | Value shape | Field-specific methods |
|---|---|---|---|---|
| **CheckboxList** | `$s->checkboxlist('x')` | `checkboxlist` | **array** of selected values | `options(list<{value, label}>)` |
| **ToggleButtons** | `$s->togglebuttons('x')` | `togglebuttons` | **scalar** by default, **array** with `->multiple()` | `options(...)`, `multiple(bool $value = true)` |
| **Slider** | `$s->slider('x')` | `slider` | **number** | `min(int\|float)`, `max(int\|float)`, `step(int\|float)` — **structural track bounds**, not validation. For a value-range rule use `minValue()`/`maxValue()` (see [Fluent validation helpers](#fluent-validation-helpers)) |

**CheckboxList** — always multi-value; the form value is an array of the checked option
values:

```php
// apps/demo/app/Admin/Pages/NewFeaturesPage.php:35-43
$s->checkboxlist('channels')
    ->label('Notification channels (CheckboxList)')
    ->options([
        ['value' => 'email', 'label' => 'Email'],
        ['value' => 'sms', 'label' => 'SMS'],
        ['value' => 'push', 'label' => 'Push'],
    ])
    ->required()
    ->rules('array'),
```

**ToggleButtons** — a segmented control. **Scalar by default** (one value); call
`->multiple()` to switch it to an array value:

```php
// apps/demo/app/Admin/Pages/NewFeaturesPage.php:45-61
$s->togglebuttons('plan')                 // single → scalar value, e.g. 'pro'
    ->label('Plan (ToggleButtons, single)')
    ->options([
        ['value' => 'free', 'label' => 'Free'],
        ['value' => 'pro', 'label' => 'Pro'],
        ['value' => 'team', 'label' => 'Team'],
    ])
    ->required(),

$s->togglebuttons('tags')                 // multiple → array value, e.g. ['new']
    ->label('Tags (ToggleButtons, multiple)')
    ->multiple()
    ->options([
        ['value' => 'new', 'label' => 'New'],
        ['value' => 'sale', 'label' => 'Sale'],
        ['value' => 'hot', 'label' => 'Hot'],
    ]),
```

**Slider** — a numeric slider; `min`/`max`/`step` are first-class methods (not `->set(...)`)
because they are structural — they drive the track range and snapping:

```php
// apps/demo/app/Admin/Pages/NewFeaturesPage.php:63-68
$s->slider('volume')
    ->label('Volume (Slider)')
    ->min(0)
    ->max(100)
    ->step(5)
    ->rules('min:0|max:100'),
```

`options()` on these fields takes the same `{value, label}` list every option-driven field
uses — the values are string-normalized on the wire, so seed defaults as strings (e.g.
`->record(['plan' => 'pro', 'channels' => ['email']])`,
`NewFeaturesPage.php:74-79`). Validation is PHP as always — `rules('array')` for the
multi-value ones, numeric range rules for the slider.

---

## Select progression — static → searchable → async → creatable

`select` is **one wire kind** that branches at runtime by which methods you call. Pick the
rung you need; each adds capability over the one above.

**1. Static** — a fixed option list, no server round-trip. Pass `options(array)` (or
`->set('options', [...])`):

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:69-73 (inside a repeater)
$s->select('type')->label('Type')
    ->set('options', [
        ['value' => 'text', 'label' => 'Text'],
        ['value' => 'link', 'label' => 'Link'],
    ]),
```

**2. Searchable** — same static options, but rendered as a filterable combobox. Add
`->searchable()`:

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:43-46
$s->select('author_id')->label('Author')
    ->searchable()
    ->set('options', $this->authorOptions())
    ->rules('nullable|exists:users,id')
```

**3. Async** — options fetched from the server on open/search instead of static props. Pass
`->query(callable)` instead of `options(array)`; this needs the async-select endpoint (see
[./wiring.md](./wiring.md)). For a pure type-ahead over a model, the dedicated `relation`
field is usually the cleaner choice:

```php
// apps/demo/app/Admin/Pages/RelationDemoPage.php:39-43
$s->relation('author_id')->label('Author')
    ->query(fn () => User::query()->orderBy('name'))
    ->labelKey('name')
    ->searchable()
    ->rules('nullable|exists:users,id'),
```

**4. Creatable** — let the user add a new option inline. Call `->creatable($fields, $using)`:
a mini-form (`$fields`) renders in the dropdown, and submitting it runs `$using` server-side
to mint the new `{value, label}`. Needs the select-create endpoint:

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:43-60
$s->select('author_id')->label('Author')
    ->searchable()
    ->set('options', $this->authorOptions())
    ->rules('nullable|exists:users,id')
    ->creatable(
        fields: [
            $s->text('name')->label('Name')->required(),
        ],
        using: function (array $validated): array {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['name'].'@placeholder.local',
                'password' => '',
            ]);

            return ['value' => (string) $user->id, 'label' => $user->name ?? $user->email];
        },
    ),
```

`->multiple()` (the `HasMultiple` trait) is orthogonal to these rungs — add it to any of them
to allow more than one selection (rendered as chips).

---

## Upload field cookbook

The upload field's storage and image-processing config lives **inline on the field**, not in
a config profile. `apps/demo/app/Admin/Pages/UploadDemoPage.php` exercises the full surface.

| Method | Signature | Default | Purpose |
|---|---|---|---|
| `accept` | `accept(string\|list<string>)` | — | MIME types / extensions, e.g. `'image/*'`, `'.pdf'`, or a list `['application/pdf', 'image/*']` to allow several |
| `disk` | `disk(string)` | `'public'` | Laravel filesystem disk |
| `directory` | `directory(string)` | `'uploads'` | Subdirectory the file is stored under |
| `visibility` | `visibility(string)` | `'public'` | `'public'` or `'private'` |
| `maxSize` | `maxSize(int $bytes)` | 5 MiB | Max upload size in **bytes** |
| `convertTo` | `convertTo(string)` | — | Re-encode the image: `'webp'` \| `'jpeg'` \| `'png'` |
| `quality` | `quality(int)` | — | Encoder quality `1-100` for the converted image |

A public-disk upload that re-encodes to webp, and a private-disk one served only through the
app:

```php
// apps/demo/app/Admin/Pages/UploadDemoPage.php:40-49
// Public disk: stored under public:docs, publicly linkable.
$s->upload('doc')->label('Public document')->required()
    ->disk('public')->directory('docs')->visibility('public')
    ->accept('image/*')->maxSize(5 * 1024 * 1024)
    ->convertTo('webp')->quality(80),
// Private disk: stored on `local` (storage/app/private), served only through the app.
$s->upload('secret')->label('Private document')
    ->disk('local')->directory('private-docs')->visibility('private')
    ->accept('image/*')->maxSize(5 * 1024 * 1024)
    ->convertTo('webp')->quality(80),
```

The upload happens over a **page-scoped JSON endpoint** (not Inertia) before the form
submits. The endpoint returns the minimal preview shape `{path, url}`; the field's form
value — what reaches `$ctx->form['file']` on submit — is the **stored path string**
(`uploads/photo.webp`), or an array of strings when `multiple()` is used. Metadata such as
`filename`, `mimeType`, `width`, `height`, and `sizes` is no longer carried through the
value; read it from disk in the submit handler if you need it (`MediaNewPage.php` shows
this). See [./wiring.md](./wiring.md) for the endpoint shape.

---

## Custom fields (app-specific)

Do not edit `packages/php/src/Dsl/Fields/` or `packages/client/src/fields/` to add an
app-specific field. Use the client registry (`registerBlock` / `defineFieldClient`) and
a matching PHP field class in the consumer app instead. See [./wiring.md](./wiring.md)
for the registration pattern; the demo's `Rating` field in
`apps/demo/resources/js/admin.tsx` is the canonical example.
