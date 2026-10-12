---
domain: tables
---

# Table DSL — server query, columns, reorder

## Decisions

- **Row reordering is a `TableBuilder` opt-in, not a new node kind.**
  `TableBuilder::reorderable('sort_order')` sets `opts['reorder'] = ['column' => …]`
  (wire shape `reorder: {column}` — an object, so it can grow without a breaking
  change) and makes that column the default sort via `??=` (an explicit
  `defaultSort()` set earlier wins). The persisted order therefore survives a
  reload: a no-sort request falls through `TableQuery::applySort` to the default
  sort, which is the reorder column ascending.
- **Reorder persistence is a plain-JSON sub-page endpoint**, not Inertia —
  `POST {page-path}/tables/{table}/reorder`, `TableReorderController`, mirroring
  `EditableColumnController`. Body `{ids: [...]}`; response
  `{effects: [refreshTable]}`. (Reorder is interactivity, not navigation.)
- **The table query closure IS the ownership scope for reordering.** The
  controller resolves the same scoped `EloquentBuilder` the table reads from and
  rejects (422) any request whose id set is not fully inside that scope
  (`whereKey($ids)->count() !== count($ids)`) — the reorder analogue of the
  editable-cell "id outside scope → 404" guard. Hitting a non-reorderable table
  is a 422 (the server never trusts the client's choice of table). The order is
  written in one `DB::transaction`, each row's `column` set to its array index.
- **Contract gate covers reorder.** The `reorder` option is added to the
  `kind=="table"` block in `structure.schema.json` and exercised by the
  kitchen-sink fixture, so schema-conformance + snapshot both pin the wire shape.
- **Editable columns are projected raw.** `ColumnProjection` skips `formatUsing()` and
  the kind formatters for any editable column: the inline editor must round-trip the
  stored value, and a `number_format`-ed string cannot be edited as a number. Units live
  in column-level `prefix`/`suffix` display nodes (shared `AffixNode` normalization with
  form fields), rendered in display mode and inside the editor's `InputGroup`. `money()`
  stays output-only; decimals edit through `numberInput()->step('0.01')`.
- **Group glues existing columns into one cell.** `Column::group()` is display glue, not
  a structured composite value: children remain query fields (search, format, tooltip,
  description), and the parent occupies one header and one stacked cell.
- **Group rejects what it cannot honor.** The parent has no value, so `sortable()` and
  `individuallySearchable()` on it throw permanently — they belong on a child. On a child,
  `sortable()`/`translatable()` throw as not-yet: only `searchable()` unfolds into the query
  today, and accepting the others would silently do nothing (unfolding: DiVotek/tbtop#295). The schema pins the pairing
  both ways — `kind: "group"` requires a non-empty `columns`, and `columns` requires
  `kind: "group"`.
- **Table rows are an allowlist.** `ColumnProjection` builds each row fresh: the record
  key, visible declared columns, the `groups()` column and `_recordUrl`/`_tooltips`/
  `_descriptions`. It used to start from the full row (`toArray()` / the query-builder
  `stdClass`), which shipped undeclared attributes, loaded relations, `->hidden()` columns
  and, on query-builder tables, every selected column. Declaring a column is the only way
  to put a field on the wire; there is deliberately no data-only escape hatch.
- **A row's identity is `_key`, not `id`.** Every projected row carries the raw record key
  under `_key`, written after the columns so none can overwrite it; the key also stays under
  its own name. The client (`readId`) and `ActionCtx::key()` read `_key` and fall back to
  `id` for rows from a consumer's own endpoint. Rejected: always aliasing the key as `id`
  (a formatted `id` column still clobbers it) and a table-level `rowKey` name (same
  clobbering, plus a schema change). Closes DiVotek/tbtop#326.

## Why

Reorder rides the existing table seam (a `TableBuilder` option + one scoped
JSON endpoint) instead of inventing a node kind or a bespoke transport — the
shape, the security model, and the effect envelope all reuse patterns the
editable-column work already proved. Making the reorder column the default sort
is the one piece of glue that makes "drag, reload, still ordered" work without
the client persisting anything itself.
