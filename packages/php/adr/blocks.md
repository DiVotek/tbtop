---
domain: blocks
---

# Display blocks (read-only primitives)

## Decisions

- **Read-only detail = display-value family, author-renders-directly (M-96).** Replaces
  the "infolist" gap. The author holds the record and passes each value to a block; there
  is deliberately no field→attribute binding/resolution layer (no `TextEntry::make('title')`
  that reads `$record->title`). The DSL owns composition; data access stays the author's.
- **Hybrid API, four new wire kinds.** One `displayValue` block covers the table-column
  kind group (`badge`/`boolean`/`icon`/`money`/`date`/`datetime`/`number`); three focused
  blocks cover the rest: `displayImage`, `displayRichtext`, `displayKeyValue`. `displayValue`
  copies the kind-sugar method bodies from `Column.php` so authoring matches the table.
- **Shared formatting via `KindFormat`.** `ColumnProjection::applyKindFormat()` was
  extracted into `Tbtop\Admin\Http\KindFormat::apply(string $kind, array $meta, mixed)` —
  the single source of date/datetime/number/money formatting. `ColumnProjection` delegates
  to it (table tests unchanged); `DisplayValueBlock` calls the same method. A value formats
  identically in a table cell and a detail view.
- **Wire split mirrors the table.** `displayValue` with `money`/`date`/`datetime`/`number`
  bakes the formatted string into `options.value` server-side and emits **no** format meta
  (currency/format/decimals would be dead weight on the wire). With `badge`/`boolean`/`icon`
  it emits the raw value plus its color/icon meta (`badge`/`boolean`/`iconMap`) and the
  client renders it — the same client-defers-rendering split the table uses.
- **Image/file: author-supplied URL, no signed-URL resolution.** `displayImage` renders a
  full-size `<img>` (`max-w-full`, not the 8px cell thumbnail) or, in `->asLink()` mode, a
  file-download anchor. Signed-URL resolution stays the upload field's job.
- **Richtext: read-only lazy Lexical composer.** `@lexical/headless` is not installed; the
  client mounts a read-only `LexicalComposer` (`editable: false`, no toolbar/history/onChange)
  lazy-loaded behind Suspense, sharing the editor's `NODES`+`theme` (extracted to
  `richtextConfig`). The block ships the `SerializedEditorState` map verbatim.
- **Contract gate, same change.** All four kinds got an `allOf` if/then branch in
  `structure.schema.json` with `additionalProperties: false` on their options, plus
  `KitchenSinkPage` nodes and a regenerated `kitchen-sink.json` — no separate-PR drift.
- **Reactive server content = `liveRegion`, closure re-render per deps change (M-146).**
  `liveRegion(name)->dependsOn(fields)->render(fn(array $deps, S $s))` closes the gap
  between `when()` (build-time existence) and `hiddenIf` (client-side pick from pre-built
  content): the closure re-runs server-side on every watched-field change via
  `POST {page}/live-region/{name}`, and the returned display nodes replace the region.
  First render happens at page assembly into `options.initial` (seeded from the form
  record — no mount round-trip); the closure must therefore be a pure function of
  `$deps` + captured scope. Deps are filtered to the declared list, scalars-to-string,
  same as `DependencyPayload`. Display nodes only — a field inside would mean a dynamic
  form schema. Reload keeps prior content dimmed (no skeleton — M-144 layout lesson);
  stale responses are dropped by last-deps-key. `when()` gates the endpoint (404);
  `hiddenIf` hides without gating.

## Why

The existing static display blocks (text/html/markdown/alert) compose a read-only page but
can't render a record's *values* (a badge, a money amount, a stored richtext) without the
author hand-formatting everything. The display-value family closes that without inventing a
binding system Filament-style — keeping the framework's "the author writes PHP, the client
renders" boundary intact. Sharing `KindFormat` is the load-bearing reuse: one formatter, so
a column and a detail field never disagree on how a date or a money value prints.
