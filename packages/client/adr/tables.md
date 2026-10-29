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

- **Row groups collapse per value, client-side only, opt-in.** Headers toggle only with
  `groups.collapsible` (or `collapsed`, which implies it). `useGroupCollapse` stores the
  groups the user flipped away from the declared default (`groups.collapsed`), keyed by
  the JSON of the group value, so the state survives a refetch or page change and a group
  that appears later opens in the default. Nothing is persisted or sent to the server.

## Why

A table that authors its own drag layer would re-solve pointer sensors,
keyboard a11y, and axis constraints that dnd-kit already ships correctly. The
pure `computeReorder`/`canReorder` split keeps the testable logic free of the
untestable gesture, so the bun suite covers the rules and the browser suite
covers only the drag.
