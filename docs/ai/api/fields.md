<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Fields

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Every field builder and its wire kind. **Every field** comes first — those methods apply to all kinds; the per-kind sections list only what that kind adds.

## Every field

`Tbtop\Admin\Dsl\Fields\Field`

| Method | What it does |
|---|---|
| `columnSpan(array\|int $span): static` | Grid column span: int (1-8) or a breakpoint object {sm?, md?, lg?, xl?}. |
| `columnStart(array\|int $start): static` | Grid column start: int (1-8) or a breakpoint object {sm?, md?, lg?, xl?}. |
| `confirmed(): static` | Requires a sibling "{name}_confirmation" field to match. |
| `copyable(string $copyMessage = 'Copied', int $copyMessageDuration = 2000): static` | Renders a copy-to-clipboard button next to the value. What lands on the clipboard is whatever reached the client, which is not always the stored value: server-formatted kinds (money/date/datetime/ number) and formatUsing() bake their output into the wire, so a money column copies "12.34 USD", not the cents. Kinds the client renders (badge/boolean/icon) and form fields copy the raw value. |
| `default(mixed $value): static` | Seeds the form value when the record has no key for this field. An explicit key in the form's record() always wins — even record(['x' => null]) keeps the null instead of this default. |
| `different(string $field): static` | Value must differ from another field's value. |
| `disabledIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side evaluation: the field still ships on the wire and its value still submits — only the input's interactivity is disabled. Contrast with when(), which drops the node from the wire entirely. Pass a Cond, or the shorthand ($field, $op, $value). |
| `filterUsing(callable $fn): static` | Attach a server-side filter closure: fn($query, $value) => $query. Takes priority over kind-default mapping. NEVER serialized to the wire. |
| `helperText(string $text): static` | Muted hint text rendered below the input, above any validation error. |
| `hiddenIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Client-side visibility: the node still ships on the wire and its value still submits with the form even while hidden. Contrast with when(), which drops the node from the wire entirely and 404s its endpoints. Pass a Cond, or the shorthand ($field, $op, $value) — e.g. hiddenIf('type', '=', 'guest'). $field resolves against the enclosing form's values; on a table row action it resolves against the row's columns instead (hiddenIf('status', '!=', 'pending')). |
| `in(array $values): static` | Value must be one of the allowed set. |
| `label(string $label): static` | Display label rendered above the input; defaults to a humanized $name when unset. |
| `markAsRequired(bool $state = true): static` | Sets the static "required" asterisk/UI marker only, with no rule. For a field made required through some other mechanism (a composite rule, a cross-field requiredIf already covering it) that still needs the visual indicator. |
| `meta(string $key, mixed $value): static` | Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf, disabledIf. Unvalidated — any other key ships and the client ignores it. For an arbitrary wire *option* use set() instead. |
| `notIn(array $values): static` | Value must NOT be one of the listed set. |
| `nullable(): static` | Value may be null/empty (skips other rules when absent). |
| `required(): static` | Marks the field required: flags it on the wire and adds a `required` validation rule. |
| `requiredIf(Cond\|string $condOrField, string $op = '', mixed $value = null): static` | Marks the field required only when the given condition holds: sets meta.requiredIf (compiled client-side into the live asterisk) and appends the equivalent server rule, derived from the Cond. Unlike required(), this does NOT set opts['required'] - the asterisk is conditional, not static. A `truthy` condition maps to required_if_accepted (true/1/on/yes) — boolean input semantics; gate on a checkbox/boolean field, not on free text. |
| `requiredWith(string ...$fields): static` | Required only when all listed fields are present. |
| `requiredWithout(string ...$fields): static` | Required only when any listed field is absent. |
| `rules(array\|string $rules): static` | Appends Laravel validation rules, merged with any already collected. Pass a `regex:` rule as an array element, never inline it in a pipe-delimited string — the pattern's own `\|` would be split on and the string form throws for this reason. |
| `rulesForLocale(string $locale, array\|string $rules): static` | Rule set for one locale of a translatable field, replacing — not adding to — whatever rules() would otherwise apply there. Only the default content locale falls back to rules() when it has no override; every other locale without one just gets 'nullable'. Unlike rules(), a pipe string here is not guarded against an inline regex: pattern. |
| `same(string $field): static` | Value must equal another field's value (e.g. password match). |
| `set(string $key, mixed $value): static` | Escape hatch: writes $key directly into the serialized node options, bypassing any dedicated fluent method. Key names are NOT validated against the schema — a typo or unsupported key ships silently and only fails (if at all) on the client. Prefer a real fluent method when one exists; use this only for a wire key with no builder support yet. |
| `tooltip(string $text): static` | Tooltip text shown in an info-icon popover next to the field label. |
| `translatable(bool $value = true): static` | Store the value as a per-locale map instead of a scalar. On a repeater, this cascades to its sub-fields rather than translating the repeater's own value (see isTranslatableField()); pair with rulesForLocale() to validate each locale independently. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## Boolean (boolean)

`Tbtop\Admin\Dsl\Fields\Boolean`

No methods beyond the shared base — see [Every field](#every-field).

## Checkbox (checkbox)

`Tbtop\Admin\Dsl\Fields\Checkbox`

No methods beyond the shared base — see [Every field](#every-field).

## CheckboxList (checkboxlist)

`Tbtop\Admin\Dsl\Fields\CheckboxList`

| Method | What it does |
|---|---|
| `options(array $options): static` | Set the fixed option list. Each entry is {value, label, description?, disabled?, display?} — values are string-normalized on the wire, so seed default()/query results with string values too. 'display' (image, subtitle, html) only renders on Select; other adopters (Radio, CheckboxList, ToggleButtons, InFilter) render only description/disabled. |

## Colorpicker (colorpicker)

`Tbtop\Admin\Dsl\Fields\Colorpicker`

No methods beyond the shared base — see [Every field](#every-field).

## Date (date)

`Tbtop\Admin\Dsl\Fields\Date`

No methods beyond the shared base — see [Every field](#every-field).

## Daterange (daterange)

`Tbtop\Admin\Dsl\Fields\Daterange`

| Method | What it does |
|---|---|
| `dependsOn(array\|string $fields): static` | Declare the parent field(s) whose value this field's options depend on. Their current values reach the query() closure as ['field' => value]. |
| `disabledRanges(Closure $fn): static` | Deps-driven disabled day ranges. $fn: fn(array $deps): array — a list of ['from' => ?string, 'to' => ?string] entries, ISO days (Y-m-d), both ends inclusive-disabled. A null 'from' disables every day up to and including 'to' (min-date semantics); a null 'to' disables 'from' and everything after (max-date). At least one end must be non-null. The closure runs at page assembly (deps seeded from the form record) and again per daterange-ranges request when a dependsOn() parent changes, so it must be a pure function of $deps + captured scope. Without dependsOn() the serialized ranges are final and the endpoint is never called. |
| `keepValueOnParentChange(bool $keep = true): static` | Keep the selected value when a parent changes (default: reset to empty). |
| `whenParentEmpty(string $mode): static` | Behavior while a declared parent has no value: 'disabled' (default) — field is disabled, no request fired; 'empty' — field stays enabled but shows an empty list. |

## Datetime (datetime)

`Tbtop\Admin\Dsl\Fields\Datetime`

No methods beyond the shared base — see [Every field](#every-field).

## InFilter (in)

`Tbtop\Admin\Dsl\Fields\InFilter`

| Method | What it does |
|---|---|
| `options(array $options): static` | Set the fixed option list. Each entry is {value, label, description?, disabled?, display?} — values are string-normalized on the wire, so seed default()/query results with string values too. 'display' (image, subtitle, html) only renders on Select; other adopters (Radio, CheckboxList, ToggleButtons, InFilter) render only description/disabled. |

## Keyvalue (keyvalue)

`Tbtop\Admin\Dsl\Fields\Keyvalue`

No methods beyond the shared base — see [Every field](#every-field).

## MediaPicker (media)

`Tbtop\Admin\Dsl\Fields\MediaPicker`

| Method | What it does |
|---|---|
| `accept(array $mimes): static` | Filter which MIME types are visible/uploadable in the picker. |
| `multiple(bool $value = true): static` | Allow selecting more than one item. |
| `reorderable(bool $value = true): static` | Allow drag-to-reorder when multiple is enabled. |
| `variant(string $variant): static` | Visual variant of the picker. Applies to single-select only — ->multiple() always renders preview chips regardless of variant. |

## Number (number)

`Tbtop\Admin\Dsl\Fields\Number`

| Method | What it does |
|---|---|
| `between(int\|float $min, int\|float $max): static` | Value must fall within the inclusive range. |
| `integer(): static` | Value must be an integer. |
| `maxValue(int\|float $value): static` | Largest accepted value. |
| `minValue(int\|float $value): static` | Smallest accepted value. |
| `multipleOf(int\|float $value): static` | Value must be a multiple of the given step. |
| `numeric(): static` | Value must be numeric. |
| `placeholder(string $text): static` | Placeholder text shown in the empty input. |
| `prefix(JsonSerializable\|string $content): static` | Content rendered before the input, inside the control (e.g. a currency symbol or icon block). A plain string becomes a TextBlock; any other JsonSerializable node is used as-is. Display nodes only — nesting a Field here throws (an affix decorates the control, it is not a second input, and its rules would never be collected). |
| `step(string\|int\|float $step): static` | Granularity of each increment (structural — drives the input's step attribute). Pass 'any' to allow arbitrary precision. |
| `suffix(JsonSerializable\|string $content): static` | Content rendered after the input, inside the control. Same rules as prefix() — display nodes only, a nested Field throws. |

## Otp (otp)

`Tbtop\Admin\Dsl\Fields\Otp`

| Method | What it does |
|---|---|
| `length(int $digits = 6): static` | Number of code slots. Drives the rendered slot count AND a server "digits:N" rule, so the backend enforces the shape the UI shows. |
| `pattern(string $regex): static` | Client-side accepted-character regex; defaults to digits-only. |

## Password (password)

`Tbtop\Admin\Dsl\Fields\Password`

| Method | What it does |
|---|---|
| `alpha(): static` | Letters only. |
| `alphaDash(): static` | Letters, numbers, dashes and underscores only. |
| `alphaNum(): static` | Letters and numbers only. |
| `endsWith(string ...$values): static` | Value must end with one of the given substrings. |
| `length(int $length): static` | Exact character count. |
| `maxLength(int $length): static` | Maximum character count. |
| `minLength(int $length): static` | Minimum character count. |
| `regex(string $pattern): static` | Match a PCRE pattern. Passed as an array element so the rule collector does not split on '\|' inside the pattern. |
| `startsWith(string ...$values): static` | Value must start with one of the given substrings. |

## Radio (radio)

`Tbtop\Admin\Dsl\Fields\Radio`

| Method | What it does |
|---|---|
| `boolean(): static` | Shorthand for a 2-option Yes/No radio. No-op if ->options() was already called. |
| `inline(bool $value = true): static` | Horizontal layout instead of the default stacked list. |
| `options(array $options): static` | Set the fixed option list. Each entry is {value, label, description?, disabled?, display?} — values are string-normalized on the wire, so seed default()/query results with string values too. 'display' (image, subtitle, html) only renders on Select; other adopters (Radio, CheckboxList, ToggleButtons, InFilter) render only description/disabled. |

## Relation (relation)

`Tbtop\Admin\Dsl\Fields\Relation`

| Method | What it does |
|---|---|
| `dependsOn(array\|string $fields): static` | Declare the parent field(s) whose value this field's options depend on. Their current values reach the query() closure as ['field' => value]. |
| `exists(string $table, ?string $column = null): static` | Value must exist in $table.$column (defaults column to field name). |
| `ignore(string\|int $id, string $idColumn = 'id'): static` | Skip the given record when checking uniqueness (edit pages). Appends ",{id},{idColumn}" to the most recent unique rule. |
| `keepValueOnParentChange(bool $keep = true): static` | Keep the selected value when a parent changes (default: reset to empty). |
| `labelKey(string $column): static` | Column name used as the display label in the relation picker. |
| `prefix(JsonSerializable\|string $content): static` | Content rendered before the input, inside the control (e.g. a currency symbol or icon block). A plain string becomes a TextBlock; any other JsonSerializable node is used as-is. Display nodes only — nesting a Field here throws (an affix decorates the control, it is not a second input, and its rules would never be collected). |
| `query(callable $fn): static` | Server-side data closure — never serialized, re-resolved from the page tree on each request. The closure contract depends on the adopter: TableBuilder — fn(): Builder, must return a FRESH builder each call (it is invoked once for rows and once per tab for counts); Tab — fn(Builder $q): void, narrow the table builder in place; Relation — fn(array $deps): Builder, the Eloquent query to pick from, $deps holding the dependsOn() parents' current values — search text and the result cap are applied on top by the endpoint (labelKey() LIKE, searchLimit()). |
| `searchLimit(int $max): static` | Caps how many rows the search endpoint returns. Server-only — never serialized. |
| `searchable(bool $value = true): static` | Type-ahead over the relation-search endpoint; without it the field renders the resolved label only. |
| `suffix(JsonSerializable\|string $content): static` | Content rendered after the input, inside the control. Same rules as prefix() — display nodes only, a nested Field throws. |
| `unique(string $table, ?string $column = null): static` | Value must be unique in $table.$column (defaults column to field name). |
| `whenParentEmpty(string $mode): static` | Behavior while a declared parent has no value: 'disabled' (default) — field is disabled, no request fired; 'empty' — field stays enabled but shows an empty list. |

## Repeater (repeater)

`Tbtop\Admin\Dsl\Fields\Repeater`

| Method | What it does |
|---|---|
| `collapsible(bool $collapsible = true): static` | Render each row collapsed to a one-line summary; click to expand the edit form. Off by default — existing repeaters stay fully expanded. |
| `defaultItems(int $count): static` | Row count RecordDefaults pads the seeded record up to, but only when the repeater's key is absent from the record entirely — it never trims or tops up an explicitly supplied value. Rows beyond any default() content are created empty, so a repeater can ship pre-filled rows plus blank ones as a prompt. |
| `fields(array $fields): static` | Child fields making up one row. May contain another repeater to nest — validation rules prefix through every level as `x.*.child.*.field`. |
| `maxItems(int $max): static` | Client-enforced cap on row count (disables "Add row" at the limit). Not re-checked server-side — a direct request can still submit more rows. |
| `minItems(int $min): static` | Client-enforced floor on row count (disables row removal at the limit). Not re-checked server-side. |
| `summary(string $field): static` | Sub-field name whose value fills the collapsed row's title (e.g. 'label'). Only read when collapsible. |

## Richtext (richtext)

`Tbtop\Admin\Dsl\Fields\Richtext`

| Method | What it does |
|---|---|
| `placeholder(string $text): static` | Placeholder text shown in the empty editor. |

## Select (select)

`Tbtop\Admin\Dsl\Fields\Select`

| Method | What it does |
|---|---|
| `creatable(array $fields, callable $using): static` | Allow creating a new option on the fly. $fields: form fields shown in the creation mini-form. $using: server closure fn(array $validated): array{value: string, label: string} Must return ['value' => ..., 'label' => ...]. |
| `dependsOn(array\|string $fields): static` | Declare the parent field(s) whose value this field's options depend on. Their current values reach the query() closure as ['field' => value]. |
| `exists(string $table, ?string $column = null): static` | Value must exist in $table.$column (defaults column to field name). |
| `ignore(string\|int $id, string $idColumn = 'id'): static` | Skip the given record when checking uniqueness (edit pages). Appends ",{id},{idColumn}" to the most recent unique rule. |
| `keepValueOnParentChange(bool $keep = true): static` | Keep the selected value when a parent changes (default: reset to empty). |
| `multiple(bool $value = true): static` | Allow selecting more than one value. |
| `options(array $options): static` | Set the fixed option list. Each entry is {value, label, description?, disabled?, display?} — values are string-normalized on the wire, so seed default()/query results with string values too. 'display' (image, subtitle, html) only renders on Select; other adopters (Radio, CheckboxList, ToggleButtons, InFilter) render only description/disabled. |
| `prefix(JsonSerializable\|string $content): static` | Content rendered before the input, inside the control (e.g. a currency symbol or icon block). A plain string becomes a TextBlock; any other JsonSerializable node is used as-is. Display nodes only — nesting a Field here throws (an affix decorates the control, it is not a second input, and its rules would never be collected). |
| `query(callable $fn): static` | Dynamic option source, served from the select-options endpoint. Any source works — a database, a config array, an enum, an external API. $fn: fn(array $deps, string $search): array $deps — current values of the fields named in dependsOn(), or []. $search — the user's current search text, '' when the list first opens. Return either a list of ['value' => ..., 'label' => ...] rows, or an associative value => label map (e.g. User::pluck('name', 'id')). Applying $search and capping the result count are the closure's responsibility — nothing filters or truncates on its behalf. A stored value's label is resolved from the associative map when the closure returns one and the value is present; otherwise from resolveUsing(); otherwise the raw value is displayed. |
| `resolveUsing(callable $fn): static` | Resolve a stored value back to its display label when query() cannot. $fn: fn(string $value): string\|array\|null — null when the value no longer exists. Return an option array (['label' => ..., 'display' => [...]]) to keep image/subtitle/html on a value the dropdown never listed. |
| `searchable(bool $value = true): static` | Render as a filterable combobox instead of a plain select. With static options the filtering is client-side over labels; with query() the typed term reaches the closure and filtering happens server-side. |
| `suffix(JsonSerializable\|string $content): static` | Content rendered after the input, inside the control. Same rules as prefix() — display nodes only, a nested Field throws. |
| `unique(string $table, ?string $column = null): static` | Value must be unique in $table.$column (defaults column to field name). |
| `whenParentEmpty(string $mode): static` | Behavior while a declared parent has no value: 'disabled' (default) — field is disabled, no request fired; 'empty' — field stays enabled but shows an empty list. |

## Slider (slider)

`Tbtop\Admin\Dsl\Fields\Slider`

| Method | What it does |
|---|---|
| `between(int\|float $min, int\|float $max): static` | Value must fall within the inclusive range. |
| `integer(): static` | Value must be an integer. |
| `max(int\|float $value): static` | Highest selectable value (structural — drives the track range). |
| `maxValue(int\|float $value): static` | Largest accepted value. |
| `min(int\|float $value): static` | Lowest selectable value (structural — drives the track range). |
| `minValue(int\|float $value): static` | Smallest accepted value. |
| `multipleOf(int\|float $value): static` | Value must be a multiple of the given step. |
| `numeric(): static` | Value must be numeric. |
| `step(int\|float $value): static` | Granularity of each thumb move (structural — drives snapping). |

## Slug (slug)

`Tbtop\Admin\Dsl\Fields\Slug`

| Method | What it does |
|---|---|
| `alpha(): static` | Letters only. |
| `alphaDash(): static` | Letters, numbers, dashes and underscores only. |
| `alphaNum(): static` | Letters and numbers only. |
| `endsWith(string ...$values): static` | Value must end with one of the given substrings. |
| `fromField(string $fieldName): static` | Set the source field whose value is used to auto-generate the slug. |
| `length(int $length): static` | Exact character count. |
| `maxLength(int $length): static` | Maximum character count. |
| `minLength(int $length): static` | Minimum character count. |
| `regex(string $pattern): static` | Match a PCRE pattern. Passed as an array element so the rule collector does not split on '\|' inside the pattern. |
| `startsWith(string ...$values): static` | Value must start with one of the given substrings. |

## Tags (tags)

`Tbtop\Admin\Dsl\Fields\Tags`

No methods beyond the shared base — see [Every field](#every-field).

## Text (text)

`Tbtop\Admin\Dsl\Fields\Text`

| Method | What it does |
|---|---|
| `alpha(): static` | Letters only. |
| `alphaDash(): static` | Letters, numbers, dashes and underscores only. |
| `alphaNum(): static` | Letters and numbers only. |
| `endsWith(string ...$values): static` | Value must end with one of the given substrings. |
| `exists(string $table, ?string $column = null): static` | Value must exist in $table.$column (defaults column to field name). |
| `ignore(string\|int $id, string $idColumn = 'id'): static` | Skip the given record when checking uniqueness (edit pages). Appends ",{id},{idColumn}" to the most recent unique rule. |
| `length(int $length): static` | Exact character count. |
| `mask(string $pattern): static` | Static input mask, Filament token alphabet: `9` = digit, `a` = letter, `*` = alphanumeric; any other character is a literal that the client inserts automatically (e.g. '(999) 999-9999'). No support for optional or repeating tokens — it's a fixed-length pattern only. |
| `maxLength(int $length): static` | Maximum character count. |
| `minLength(int $length): static` | Minimum character count. |
| `placeholder(string $text): static` | Placeholder text shown in the empty input. |
| `prefix(JsonSerializable\|string $content): static` | Content rendered before the input, inside the control (e.g. a currency symbol or icon block). A plain string becomes a TextBlock; any other JsonSerializable node is used as-is. Display nodes only — nesting a Field here throws (an affix decorates the control, it is not a second input, and its rules would never be collected). |
| `regex(string $pattern): static` | Match a PCRE pattern. Passed as an array element so the rule collector does not split on '\|' inside the pattern. |
| `startsWith(string ...$values): static` | Value must start with one of the given substrings. |
| `suffix(JsonSerializable\|string $content): static` | Content rendered after the input, inside the control. Same rules as prefix() — display nodes only, a nested Field throws. |
| `unique(string $table, ?string $column = null): static` | Value must be unique in $table.$column (defaults column to field name). |

## Textarea (textarea)

`Tbtop\Admin\Dsl\Fields\Textarea`

| Method | What it does |
|---|---|
| `alpha(): static` | Letters only. |
| `alphaDash(): static` | Letters, numbers, dashes and underscores only. |
| `alphaNum(): static` | Letters and numbers only. |
| `endsWith(string ...$values): static` | Value must end with one of the given substrings. |
| `length(int $length): static` | Exact character count. |
| `maxLength(int $length): static` | Maximum character count. |
| `minLength(int $length): static` | Minimum character count. |
| `placeholder(string $text): static` | Placeholder text shown in the empty textarea. |
| `regex(string $pattern): static` | Match a PCRE pattern. Passed as an array element so the rule collector does not split on '\|' inside the pattern. |
| `startsWith(string ...$values): static` | Value must start with one of the given substrings. |

## Time (time)

`Tbtop\Admin\Dsl\Fields\Time`

| Method | What it does |
|---|---|
| `minuteStep(int $minutes): static` | Minute picker granularity, 1-60. Mutually exclusive with seconds() — combining them throws. |
| `secondStep(int $seconds): static` | Second picker granularity, 1-59. Only meaningful after seconds() — calling it first throws. |
| `seconds(): static` | Show a seconds picker alongside hours/minutes. Mutually exclusive with minuteStep() — combining them throws. Call before secondStep(). |

## ToggleButtons (togglebuttons)

`Tbtop\Admin\Dsl\Fields\ToggleButtons`

| Method | What it does |
|---|---|
| `multiple(bool $value = true): static` | Allow selecting more than one value. |
| `options(array $options): static` | Set the fixed option list. Each entry is {value, label, description?, disabled?, display?} — values are string-normalized on the wire, so seed default()/query results with string values too. 'display' (image, subtitle, html) only renders on Select; other adopters (Radio, CheckboxList, ToggleButtons, InFilter) render only description/disabled. |

## Upload (upload)

`Tbtop\Admin\Dsl\Fields\Upload`

| Method | What it does |
|---|---|
| `accept(array\|string $accept): static` | Accepted MIME types / extensions, e.g. 'image/*', '.pdf', or a list ['application/pdf', 'image/*'] to allow several. |
| `convertTo(string $format): static` | Convert the stored image to this format ('webp'\|'jpeg'\|'png'). |
| `directory(string $dir): static` | Subdirectory the file is stored under (default 'uploads'). |
| `disk(string $disk): static` | Laravel filesystem disk name (default 'public'). |
| `maxFiles(int $max): static` | Maximum number of files when multiple is enabled. |
| `maxSize(int $bytes): static` | Max upload size in bytes (default 5 MiB). |
| `multiple(bool $value = true): static` | Allow selecting more than one value. |
| `quality(int $q): static` | Encoder quality (1-100) for the converted image. |
| `reorderable(bool $value = true): static` | Allow drag-to-reorder when multiple is enabled. |
| `saveUsing(Closure $fn): static` | Override how an uploaded file is stored. The closure receives the UploadedFile and the resolved UploadFieldConfig and must return the wire shape `{path, url}`. Default stores to the configured disk. Never serialized to the client. Bypasses UploadStorer::store() entirely, so SVG sanitization is skipped — the mime-guard (accept + text/html rejection) still runs first, but a custom closure that stores SVGs must sanitize them itself. |
| `visibility(string $v): static` | Storage visibility: 'public' (default) or 'private'. |
