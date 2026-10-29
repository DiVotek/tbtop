---
domain: tables
---

# Table client — rendering, drag reorder

## Decisions

- **dnd-kit is the drag-reorder dependency** (`@dnd-kit/core`, `/sortable`,
  `/modifiers`, `/utilities`). Chosen over native HTML5 drag and other libs
  because it is headless (no imposed DOM/markup), accessibility-first
  (`KeyboardSensor` + `sortableKeyboardCoordinates` give keyboard reordering for
  free), React-19 compatible (peer `react >=16.8`), and ships modifiers
  (`restrictToVerticalAxis`, `restrictToParentElement`) that keep a sortable
  `<tr>` from drifting sideways inside an `overflow-x-auto` table.
- **The drag context mounts only while reorder is allowed.** `canReorder`
  (pure, in `reorder.ts`) gates it: reorder configured, no sort (or sort ==
  `{column}:asc`), no active filters/search, default tab. When blocked, no
  `DndContext` is mounted, no handle column renders, and a disabled-grip hint is
  shown — matching Filament. This keeps the sortable wiring entirely out of the
  DOM whenever it would produce a wrong drop target.
- **`DndContext` wraps the `<table>`, never its `<tbody>`.** dnd-kit injects a
  hidden a11y `<div>` at the context location; placing the context inside
  `<table>` would make that an invalid table child. Wrapping the outer container
  keeps the markup valid.
- **Optimism with rollback.** On drop the row order updates locally first, then
  the POST fires; success calls `onRefresh()` (server truth), a reject restores
  the pre-drag snapshot and notifies. The order math (`computeReorder` →
  `arrayMove`) and the disable predicate are pure and unit-tested; the drag
  gesture itself is covered by a real-browser Pest test, not happy-dom.
- **Active-filter chips read the applied params, not the filter form.**
  `queryParams.filters` is what narrowed the rows, so a deferred table's pending
  edits get no chip until Apply. Removing a chip drops that key from both the
  applied params and the form values, leaving the other pending edits alone;
  "Clear filters" keeps the search (unlike the form's Reset). Client-only, no
  wire change: labels come from the filter node's own options, and an async
  select resolves through the same `onLoad` its control uses.

## Why

A table that authors its own drag layer would re-solve pointer sensors,
keyboard a11y, and axis constraints that dnd-kit already ships correctly. The
pure `computeReorder`/`canReorder` split keeps the testable logic free of the
untestable gesture, so the bun suite covers the rules and the browser suite
covers only the drag.
