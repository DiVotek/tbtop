# feat(table): glue leaf columns into one cell and render a muted description

touches: group, description, column wire, column projection, table search, table cell

> ⚠️ **Contract** table column: no `description` / nested `columns` → `description?: string` and recursive `columns` (`$ref` `#/$defs/columns`), paired by `if/then` in both directions: `kind: "group"` requires a non-empty `columns`, and `columns` requires `kind: "group"`.
> ⚠️ **Contract** kitchen-sink: title column gains `description: "Headline"`; new `car` column `kind: "group"` with leaves `car_name` (emphasized) and `car_plate` (muted).

A table column may carry a **description** (static string on the column, or a per-row closure resolved into `row._descriptions`, same shape as tooltip). **Group** is display glue, not a composite value: `Column::group()` sets `kind: "group"` and nested `columns`; projection writes the leaves into the row and never `computeValue`s the parent; the client paints one `<td>` as a vertical stack. Search unfolds child names (or every child, when the parent is searchable). Serialize rejects empty groups, nested groups, editable parent or child, copyable parent, individually-searchable children, and duplicate leaf names vs top-level columns.

Only `searchable()` unfolds into the children today, so the DSL rejects everything it cannot honor rather than dropping it silently. On the parent, `sortable()` and `individuallySearchable()` throw permanently: the parent is not a query field, and `sortableColumnNames()` would otherwise emit `order by "car"` — tolerated by SQLite, a 500 on MySQL/Postgres. On a child, `sortable()` and `translatable()` throw as not-yet, because `sortableColumnNames()`/`translatableColumns()` still walk only top-level columns. Lifting the child restriction later is additive — tracked in DiVotek/tbtop#295.

Wiring: API reference `docs/ai/api/tables.md`, glossary `CONTEXT.md`, tables ADR, kitchen-sink page fixture.

```mermaid
flowchart LR
    subgraph client["@tbtop/inertia-admin"]
        header(["table header"]):::unchanged
        types["TableColumn<br/>+description +columns<br/><small>tableColumnTypes.ts</small>"]:::touched
        cell["table cell<br/>+GroupCell +DescriptionLine<br/><small>tableCell.tsx</small>"]:::changed
    end
    subgraph wire["Contract"]
        col["column wire<br/>+description +nested columns"]:::changed
    end
    subgraph server["tbtop/admin"]
        dsl["Group / Description<br/>+group() +description()<br/><small>Column.php</small>"]:::changed
        proj["column projection<br/>+project leaves, skip parent<br/>+_descriptions like tooltips<br/><small>ColumnProjection.php</small>"]:::changed
        search["table search<br/>+unfold group child names<br/><small>TableBuilder.php</small>"]:::changed
        tq(["TableQuery LIKE"]):::unchanged
    end

    dsl --> col
    col --> types
    types --> cell
    header -.-> cell
    dsl --> proj
    proj ==>|"hero: leaves stay query fields, parent is one stacked cell"| cell
    search --> tq
    dsl --> search

    classDef changed fill:#0d3b1e,stroke:#2ea043,color:#fff
    classDef touched fill:#21262d,stroke:#8b949e,stroke-dasharray:4,color:#ddd
    classDef unchanged fill:#21262d,stroke:#484f58,color:#aaa
    classDef removed fill:#3b0d0d,stroke:#da3633,color:#fff
```

**Read by eye:**
- `packages/contracts/structure.schema.json`
- `packages/contracts/fixtures/kitchen-sink.json`
- `packages/php/src/Http/ColumnProjection.php`
- `packages/client/src/structure/table/tableCell.tsx`
