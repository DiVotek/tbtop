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

## Why

Reorder rides the existing table seam (a `TableBuilder` option + one scoped
JSON endpoint) instead of inventing a node kind or a bespoke transport — the
shape, the security model, and the effect envelope all reuse patterns the
editable-column work already proved. Making the reorder column the default sort
is the one piece of glue that makes "drag, reload, still ordered" work without
the client persisting anything itself.
