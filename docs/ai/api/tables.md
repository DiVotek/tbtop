<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Tables

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

The table builder, its columns, and filter tabs.

## TableBuilder

`Tbtop\Admin\Dsl\TableBuilder`

| Method | What it does |
|---|---|
| `bulkActions(array $actions): self` | Actions available for a selection of rows, shown once at least one row is checked. |
| `columnToggle(bool $value = true): self` | Show/hide just the column-visibility ("Columns") dropdown in the toolbar. |
| `columns(array $columns): self` | Accept Column instances, raw arrays, or shorthand ['name' => 'Label']. A dotted name (Column::make('customer.name')) reads through a loaded relation via data_get — eager-load it in query() (fn () => Order::query()->with('customer')). Display only: sort and search run as SQL on the column name, so sortable()/searchable() on a dotted column errors at query time. |
| `defaultSort(string $field, string $dir = 'asc'): self` | Initial sort applied when the request carries no sort param. Feeds two couplings: groups($column) requires defaultSort($column, ...) to be set first (else it throws), and reorderable() writes its own defaultSort for the reorder column unless one is already set — so call defaultSort() before reorderable() only if you want to override it. |
| `deferFilters(bool $value = true): self` | Require an explicit Apply action before filter changes narrow the query. |
| `embedded(bool $value = true): self` | Render the table without its toolbar (search/filters/column-visibility) or pagination footer — for embedding inside a section/card alongside other content. Rows, badges, recordUrl, and perPage still apply. |
| `emptyState(string $heading, ?string $description = null, ?string $icon = null): self` | Customize the empty-table message. $icon is a registered client icon name. |
| `filters(array $fields): self` | Declare filter fields (same Field instances used in forms); renders in a modal unless filtersIn() says otherwise. Kinds with a built-in WHERE mapping: select/radio/number/date/datetime/time (=), boolean, in/tags (IN), daterange (between). Any other kind — text, relation, … — throws at request time unless it carries a filterUsing() closure. |
| `filtersFormColumns(int $columns): self` | Number of grid columns for the filters form layout (1-12). |
| `filtersFormWidth(string $width): self` | Width of the filters modal. Only meaningful when filtersIn('modal'). |
| `filtersIn(string $mode): self` | Where declared filters() render: a dismissible modal, or inline in the toolbar. |
| `groups(string $column): self` | Group contiguous rows sharing $column's value. Requires defaultSort($column, ...) first. |
| `headerActions(array $actions): self` | Actions rendered above the table (e.g. a Create button). |
| `openRecordUrlInNewTab(bool $newTab = true): self` | Open the record URL in a new browser tab. |
| `paginate(int $perPage = 25, array $options = [10, 25, 50, 100]): self` | Configure pagination. Pagination is always active; this method just customises the defaults. |
| `perPage(int $perPage): self` | Deprecated — sets only perPage on the pagination spec, kept for back-compat. Use paginate() for the unified pagination config. |
| `query(callable $fn): static` | Server-side data closure — never serialized, re-resolved from the page tree on each request. The closure contract depends on the adopter: TableBuilder — fn(): Builder, must return a FRESH builder each call (it is invoked once for rows and once per tab for counts); Tab — fn(Builder $q): void, narrow the table builder in place; Relation — fn(array $deps): Builder, the Eloquent query to pick from, $deps holding the dependsOn() parents' current values — search text and the result cap are applied on top by the endpoint (labelKey() LIKE, searchLimit()). |
| `recordUrl(Closure $resolver): self` | Make each row a link. $resolver receives the row (the Eloquent model, or the stdClass for DB::table() rows) and returns a URL; the client navigates there on row click. Never serialized. |
| `reorderable(string $column = 'sort_order'): self` | Enable drag-and-drop row reordering, persisting order to $column. The reorder column becomes the default sort so the persisted order survives a reload — an explicit defaultSort() set earlier still wins. |
| `rowActions(array $actions): self` | Actions rendered per row, e.g. Edit/Delete. |
| `rowClick(string $actionName): self` | Set the row-click action: clicking a row triggers the named row action. Interpolated client-side; must match a name in rowActions(). |
| `searchInput(bool $value = true): self` | Show/hide just the search input in the toolbar. |
| `searchPlaceholder(string $text): self` | Placeholder text for the search input (defaults to a generic i18n string). |
| `searchable(array $fields): self` | Table-level global search fields, by FIELD name (not necessarily a visible column). Merges additively with any Column::searchable() — searchableFields() unions both lists, neither one overrides the other. |
| `set(string $key, mixed $value): self` | Escape hatch: writes $key directly into the serialized table node options, bypassing any dedicated fluent method. Key names are NOT validated against the schema — a typo or unsupported key ships silently. Prefer a real fluent method when one exists; use this only for a wire key with no builder support yet. |
| `softDeletes(S $s, string $model, array $options = []): self` | Soft-delete convenience layer over existing primitives: prepends active/trashed/all tabs and appends restore/forceDelete row + bulk actions. Each part opts out via $options. Everything MERGES with config already set, so call this AFTER your own tabs()/rowActions()/bulkActions(). The active tab lands first so it is the default; the global SoftDeletes scope hides trashed rows until the consumer switches tabs. |
| `tabs(array $tabs): self` | Declare predefined filter tabs. Tab names must be unique per table; the first declared tab is the default when no tab param is sent. |
| `toolbar(bool $value = true): self` | Show/hide the search input and column-visibility dropdown as a pair. Tabs and headerActions are unaffected. Filters (inline/modal) are unaffected — they render alongside the toolbar regardless. |
| `when(Closure\|bool $condition): static` | Server-side existence gate: false (or a closure resolving falsy) means the node is dropped before serialization — absent from the wire, and any endpoint scoped to it (action, query, data) answers 404. Not the same as hiddenIf()/disabledIf(), which ship the node and let the client hide/disable it while its value still submits. |

## Column

`Tbtop\Admin\Dsl\Column`

| Method | What it does |
|---|---|
| `align(string $align): static` | Horizontal alignment of the cell content and header. |
| `alt(string $alt): static` | Alt text for the image thumbnail. |
| `badge(array $colors): static` | Render the cell as a colored badge; sets kind = 'badge'. A value with no entry in $colors still renders (gray/default badge styling), it just doesn't get its own color. |
| `boolean(?string $trueIcon = null, ?string $falseIcon = null, Color\|string\|null $trueColor = null, Color\|string\|null $falseColor = null): static` | Kind sugar: sets kind = 'boolean' with optional icon/color overrides for true/false; the client renders the icon, no server formatting involved. |
| `circular(): static` | Circular shape. Last shape call wins. |
| `color(): static` | Render the column value as a color swatch; sets kind = 'color'. |
| `copyable(string $copyMessage = 'Copied', int $copyMessageDuration = 2000): static` | Renders a copy-to-clipboard button next to the value. What lands on the clipboard is whatever reached the client, which is not always the stored value: server-formatted kinds (money/date/datetime/ number) and formatUsing() bake their output into the wire, so a money column copies "12.34 USD", not the cents. Kinds the client renders (badge/boolean/icon) and form fields copy the raw value. |
| `date(?string $format = null): static` | Kind sugar: sets kind = 'date' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'Y-m-d'. |
| `datetime(?string $format = null): static` | Kind sugar: sets kind = 'datetime' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'Y-m-d H:i:s'. |
| `emphasized(bool $value = true): static` | Style the cell text as an emphasized primary link-style label (e.g. a title column driving rowClick). |
| `formatUsing(Closure $fn): static` | Server-side formatter, fn(mixed $value, Model\|object $row): mixed, run in ColumnProjection per row ($row is the raw row, before this column's own value is written back). Runs INSTEAD OF kind-sugar formatting (date/datetime/number/money), not in addition — set a kind for wire metadata (align, filter type) if needed, but formatUsing() alone decides the displayed value. |
| `hidden(): static` | Excludes the column from the wire and from projection entirely — no client UI can bring it back. |
| `icon(string $name, string $position = 'left'): static` | A fixed icon shown beside every cell value (kebab-case Lucide name). For an icon that varies with the value, use iconMap() instead. |
| `iconMap(array $map): static` | Render the cell as an icon keyed by value; sets kind = 'icon'. A value with no entry in $map falls back to rendering the raw value as text. |
| `image(): static` | Render the column value as a thumbnail image; sets kind = 'image'. |
| `individuallySearchable(bool $value = true): static` | Enable a per-column search input in the table toolbar/header. |
| `kind(string $kind): static` | Raw kind string; prefer a dedicated kind method (money(), badge(), image(), ...) when one exists. |
| `label(string $label): static` | Column header text; defaults to a humanized $name when unset. |
| `link(Closure $url, bool $external = false, ?string $icon = null): static` | Render the column as a link. $url receives the row (the Eloquent model, or the stdClass for DB::table() rows) and returns a URL or null (null → empty cell). Never serialized. Like every kind method, exclusive with the other kinds — the last one called wins. |
| `money(string $currency): static` | Money kind: takes the stored value in MINOR units (integer cents), divides by 100 and appends $currency — store 1999, not 19.99. Output only: for an inline-editable decimal amount use numberInput()->step('0.01')->suffix('USD'), and on forms number()->step('0.01')->prefix('$') with conversion in onSubmit. |
| `muted(bool $value = true): static` | Style the cell text small and muted — for secondary metadata columns (dates, parents, counts). |
| `noWrap(bool $value = true): static` | Prevent cell content from wrapping (single line, may overflow). Mutually exclusive with wrap()/truncate() — last call wins. |
| `number(?int $decimals = null): static` | Kind sugar: sets kind = 'number' and stores $decimals; formatting (number_format) is applied server-side by KindFormat, not here. Omitting $decimals leaves the raw value unformatted. |
| `numberInput(): static` | Make the column an inline number input; sets kind = 'number' when no kind is already set. The cell ships the stored value raw (no number_format) so the editor can round-trip it; add prefix()/suffix() for a unit and step() for decimals. |
| `onSave(Closure $fn): static` | Consumer-provided save closure — REQUIRED when column is editable. |
| `options(array $options): static` | Static options for an editable select column. Uses the same {value, label} normalization the Select field emits so the wire shape matches. |
| `prefix(JsonSerializable\|string $content): static` | Display node rendered before the cell value — in display mode for any kind (boolean ignores it) and inside the inline editor for text / number / select columns. A string becomes a TextBlock; a nested Field throws. |
| `rounded(): static` | Rounded-corner shape. Last shape call wins. |
| `rules(array\|string $rules): static` | Laravel validation rules applied before the save closure runs. Accepts pipe-delimited string or an array; deduplicates entries. |
| `searchable(bool $searchable = true): static` | Include this column in the table's global search. See TableBuilder::searchable() for how column- and table-level search combine. |
| `selectColumn(): static` | Make the column an inline (sync) select; sets kind = 'select' when no kind is already set. |
| `sortBy(string $field): static` | Server-only: sort by a different field than the column name when this column is sorted. $field may be a dot-path to a related column (e.g. "contact.full_name") — resolved via a correlated subquery, no JOIN. Ignored when sortUsing() is also set (sortUsing wins). Never serialized. |
| `sortUsing(Closure $fn): static` | Server-only: full control over the ORDER BY when this column is sorted. Wins over sortBy(). fn(Builder $query, string $direction): void\|Builder — $direction is already validated to 'asc'\|'desc'. Never serialized. |
| `sortable(bool $sortable = true): static` | Allow the user to sort the table by this column. |
| `square(): static` | Square shape (sharp corners). Last shape call wins. |
| `step(string\|int\|float $step): static` | Increment granularity of the inline number editor (its step attribute). Accepts a number, a numeric string ('0.01' — shipped as a number), or 'any' for arbitrary precision. |
| `suffix(JsonSerializable\|string $content): static` | Display node rendered after the cell value (e.g. a currency code). Same rules as prefix(). |
| `textInput(): static` | Make the column an inline text input; sets kind = 'text' when no kind is already set. |
| `time(?string $format = null): static` | Kind sugar: sets kind = 'time' and stores $format; formatting is applied server-side by KindFormat, not here. Defaults to 'H:i'. |
| `toggle(): static` | Make the column an inline boolean toggle; sets kind = 'boolean'. |
| `toggleable(bool $toggleable = true, bool $hiddenByDefault = false): static` | Lets the user show/hide this column via the column-visibility dropdown. $hiddenByDefault only sets the initial state — the column still ships on the wire and the user can re-enable it. Contrast with hidden(), which excludes the column from the wire entirely and no UI can undo it. |
| `tooltip(Closure\|string $tooltip): static` | String → static tooltip, serialized as-is. Closure → per-row resolver, run server-side in ColumnProjection and never serialized (mirrors link()'s linkResolver pattern). |
| `translatable(bool $value = true): static` | Read the cell value from the record's per-locale map for the active locale, instead of a scalar. |
| `truncate(): static` | Truncate overflowing cell content with an ellipsis. Mutually exclusive with wrap()/noWrap() — last call wins. |
| `uppercase(bool $value = true): static` | Style the cell text uppercase with wide tracking — for short code-like values (types, statuses). |
| `visible(Closure $closure): static` | Pass a closure returning bool; false → column excluded from wire & projection. |
| `width(string $width): static` | Column width as a CSS length (e.g. '120px', '10%'). |
| `wrap(): static` | Allow cell content to wrap onto multiple lines. Mutually exclusive with truncate()/noWrap() — last call wins. |

## Tab

`Tbtop\Admin\Dsl\Tab`

| Method | What it does |
|---|---|
| `count(bool $count = true): self` | Opt into a count badge for this tab (off by default). |
| `description(string $description): self` | Optional subtitle shown under the page title while this tab is active. |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `label(?string $label): self` | Display text for the tab; falls back to the raw tab name when unset. |
| `query(callable $fn): static` | Server-side data closure — never serialized, re-resolved from the page tree on each request. The closure contract depends on the adopter: TableBuilder — fn(): Builder, must return a FRESH builder each call (it is invoked once for rows and once per tab for counts); Tab — fn(Builder $q): void, narrow the table builder in place; Relation — fn(array $deps): Builder, the Eloquent query to pick from, $deps holding the dependsOn() parents' current values — search text and the result cap are applied on top by the endpoint (labelKey() LIKE, searchLimit()). |
| `tooltip(string $text): static` | Tooltip text shown on hover. |
