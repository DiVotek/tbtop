# Field Inventory

> Back to [./README.md](./README.md)

Check here before building any field — 21 exist across the PHP DSL and client.

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
on `S` (not magic dispatch).

| Field | `S` factory | Wire `kind` | Field-specific methods | Needs server endpoint? |
|---|---|---|---|---|
| **Text** | `$s->text('x')` / `Text::make('x')` | `text` | none | No |
| **Textarea** | `$s->textarea('x')` / `Textarea::make('x')` | `textarea` | none | No |
| **Password** | `$s->password('x')` / `Password::make('x')` | `password` | none | No |
| **Number** | `$s->number('x')` / `Number::make('x')` | `number` | none (use `->set('min', ...)`, `->set('step', ...)` via base `set`) | No |
| **Date** | `$s->date('x')` / `Date::make('x')` | `date` | none | No |
| **Datetime** | `$s->datetime('x')` / `Datetime::make('x')` | `datetime` | none | No |
| **Date range** | `$s->daterange('x')` / `Daterange::make('x')` | `daterange` | none; value shape: `{from?: string, to?: string}` | No |
| **Boolean** | `$s->boolean('x')` / `Boolean::make('x')` | `boolean` | none | No |
| **Checkbox** | `$s->checkbox('x')` / `Checkbox::make('x')` | `checkbox` | none | No |
| **Radio** | `$s->radio('x')` / `Radio::make('x')` | `radio` | `options(list<{value, label}> $options)` — static option list | No |
| **Select** | `$s->select('x')` / `Select::make('x')` | `select` | `options(array)`, `searchable(bool)`, `query(callable)` (async), `creatable(array $fields, callable $using)` | `query()` → async-select endpoint; `creatable()` → select-create endpoint. See [./wiring.md](./wiring.md) |
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
