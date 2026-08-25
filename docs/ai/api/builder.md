<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# The `S` builder

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Everything reachable from the `S` instance injected into `view(S $s)`. Field factories are magic `__call` dispatch and are listed in [fields.md](./fields.md) instead; layout-block option vocabularies are hand-documented in [authoring-pages.md](../authoring-pages.md#layout-blocks).

## S

`Tbtop\Admin\Dsl\S`

| Method | What it does |
|---|---|
| `action(string $name): ActionBuilder` | Registers the action under $name in this page's request-scoped registry, so the HTTP layer can resolve it by name — keep names unique per page, since re-using one replaces the earlier entry. |
| `actionGroup(string $label, array $actions, ?string $as = null): Node` | Action-group node: a button group or dropdown containing multiple action items. |
| `actionsRow(array $actions, array $opts = []): Node` | Row of standalone action buttons, outside any form or table. |
| `aside(array $children, array $opts = []): Node` | Fixed-width (w-80) side column: place it as a sibling of the main content inside row()/flex() — row([tabs, aside]) is the detail-page shape. It does not stick on scroll. Not the same as section(['aside' => node]), which is a column inside one card. $opts supports 'class' (extra Tailwind classes merged onto the root element). |
| `chart(string $name, string $type, array $opts = []): ChartBuilder` | Registers the chart under $name in this page's request-scoped registry, so the HTTP layer can resolve it by name — keep names unique per page, since re-using one replaces the earlier entry. $type picks the client chart component: 'line', 'bar', 'area', 'pie', or 'donut'. $opts keys: 'title', 'description', 'height' (px), 'series' (list of ['dataKey' => column, 'label'?, 'color'?]), 'xKey' (the x-axis column for line/bar/area) or 'nameKey' (the slice-label column for pie/donut). Static data goes in 'data' as a list of rows; ->query() replaces it. |
| `collapsible(array $opts, array $children): Node` | Collapsible layout node: a section with a chevron toggle. $opts must include 'label'; 'collapsed' defaults to false. |
| `displayAlert(string $message): AlertBlock` | Inline alert/callout box; chain ->color() / ->title() on the returned block. |
| `displayDivider(): Node` | Horizontal rule. |
| `displayHtml(string $rawHtml): HtmlBlock` | Raw HTML block, rendered unsanitized — the author owns escaping. |
| `displayImage(string $src): DisplayImageBlock` | Read-only full-size image (or file-download link via ->asLink()). The author passes a URL they already hold; chain ->alt() / ->caption(). |
| `displayKeyValue(array $map): DisplayKeyValueBlock` | Read-only <dl> map render of key/value pairs. |
| `displayRichtext(array $state): DisplayRichtextBlock` | Read-only render of a stored Lexical SerializedEditorState map. |
| `displayText(string $content): TextBlock` | Static text block. There is no bare heading(): a heading is displayText()->variant('heading'). |
| `displayValue(mixed $value): DisplayValueBlock` | Read-only display of one value, formatted like a table column. The author passes the value directly; chain a kind-sugar method (->badge / ->boolean / ->icon / ->money / ->date / ->datetime / ->number) on the result. It has no label of its own — pair it with a displayText() heading, or use displayKeyValue() for labelled pairs. |
| `dropdown(string $label, array $actions): Node` | Explicit dropdown grouping — its actions render inside a menu (never inline), even for a single action. Sugar over actionGroup(..., 'dropdown'). |
| `flex(array $children, string $direction = 'row', ?string $justify = null, ?string $align = null, ?int $gap = null, bool $wrap = false, ?string $variant = null, ?string $class = null): Node` | Flex layout node with explicit direction and optional alignment options. |
| `form(string $name, array $children): FormBuilder` | Registers the form under $name in this page's request-scoped registry, so the HTTP layer can resolve it by name — keep names unique per page, since re-using one replaces the earlier entry. |
| `grid(array $opts, array $children): Node` | Grid layout. `cols` accepts an int (1-8, back-compat: single column below md) or a breakpoint object {sm?, md?, lg?, xl?} (each 1-8). `gap` (0-12, default 4) reuses the flex gap-N scale. `class` merges extra Tailwind classes onto the root element. |
| `inFilter(string $name): InFilter` | Generic multi-value IN filter: fixed option list, applies WHERE col IN (...). |
| `list(string $name): ListBuilder` | Generic row list — "Recently updated pages" style widget. |
| `liveRegion(string $name): LiveRegionBuilder` | Server-rendered region that reloads when the declared form fields change. Must sit inside a form — its deps are that form's field values. See LiveRegionBuilder for the render-closure contract. |
| `localeSwitcher(?string $variant = null): Node` | Standalone UI-locale switcher; hidden when the panel has one locale. |
| `logo(): Node` | Panel brand text (falls back to the nav.title translation). |
| `markdown(string $content): MarkdownBlock` | Markdown display block — converts markdown to HTML server-side and emits a `displayHtml` wire node. Embedded HTML is stripped by default; call ->allowHtml() on the returned block to pass it through. |
| `navMenu(): Node` | Sidebar navigation groups built from the panel pages. |
| `notifications(): Node` | Header notifications bell: unread badge + polled dropdown list. |
| `register(string $kind, string $fieldClass): void` | Register a custom field kind. $fieldClass must extend Field. A $kind colliding with a public S method (section, table, form, ...) is unreachable — PHP resolves the method before __call. Overriding a built-in kind works but is unsupported; don't rely on it. |
| `row(array $children, array $opts = []): Node` | Horizontal flex container. $opts accepts 'class', 'gap', 'colSpan', 'colStart', plus the meta keys (id, hidden, disabled, hiddenIf, disabledIf). |
| `section(array $opts, array $children): Node` | Card section. Accepted $opts keys: 'title', 'description' (muted text under the title), 'icon' (string name or {name, position}), 'aside' (a child node rendered as a right-side column on wide screens), 'collapsible' (bool, default false), 'collapsed' (bool, only relevant when collapsible), 'columns' (int\|breakpoint-object — lays out the section's children in a grid instead of a stack), 'action' (['label' => string, 'url' => string] — a quiet link rendered right-aligned in the header row, e.g. "Open pages"), 'variant' ('card'\|'plain' — 'card' wraps the section in a bordered card with an inline header; 'plain' renders the title as an uppercase muted label. Omitted = current stack render), 'class' (extra Tailwind classes merged onto the section's root element). All variants retain the same description, icon, action, aside, and collapsible behavior; the variant changes visual chrome only. |
| `spacer(): Node` | Flex spacer pushing the following siblings to the far edge. |
| `stack(array $children, array $opts = []): Node` | Vertical flex container. $opts accepts 'class', 'gap', 'colSpan', 'colStart', plus the meta keys (id, hidden, disabled, hiddenIf, disabledIf). |
| `stat(string $label): Stat` | Registers the stat under $label in this page's request-scoped registry, so the HTTP layer can resolve it by name — keep labels unique per page, since re-using one replaces the earlier entry. |
| `table(string $name): TableBuilder` | Registers the table under $name in this page's request-scoped registry, so the HTTP layer can resolve it by name — keep names unique per page, since re-using one replaces the earlier entry. |
| `tabs(array $tabs, array $opts = []): Node` | Tab container. Each tab needs 'body' (a single node) XOR 'children' (a list, optionally laid out via 'columns'), plus a 'label' or 'name' to derive one from. Pass 'name' in $opts to make this a named tabs block (every tab then also needs its own unique 'name', for URL/state addressing). |
| `themeToggle(): Node` | Standalone theme toggle; one click cycles light → dark → system. |
| `unsavedIndicator(?string $label = null): Node` | "Unsaved changes" indicator for the nearest enclosing form. Renders nothing when that form is clean. $label overrides the default translated text. |
| `userMenu(array $opts = []): Node` | Profile dropdown: user identity, custom items, locale, logout. Pass ['locales' => false] to hide the built-in language section when the panel offers locale switching elsewhere. |
