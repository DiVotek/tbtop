// oxlint-disable max-lines -- DSL builder: fluent method lists are exempt (CLAUDE.md)
import type { ActionBuilder } from "../action";
import { Select } from "../fields/choices";
import type { Field } from "../fields/field";
import { HasWhen, mixin } from "../mixin";
import { includes, Node } from "../node";
import { Column, type Row } from "./column";
import { searchableNames } from "./search";
import { Tab } from "./tab";

const FILTERS_IN = ["modal", "inline", "aside"];
const FILTER_WIDTHS = ["sm", "md", "lg", "full"];
const MIN_POLL_SECONDS = 5;

/** A Column, or the `{name: "Label"}` text-column shorthand. */
export type ColumnEntry = Column | Record<string, string>;

/**
 * A table (TableBuilder.php). `Q` is the host's query type (a Kysely builder,
 * a Drizzle query…): query(), tab and filter closures pass it through and a
 * table driver runs it. The closures never reach the wire.
 */
export class TableBuilder<Q = unknown> {
	private columnList: Column[] = [];
	private opts: Record<string, unknown> = {};
	private searchList: string[] = [];
	private filterList: Field[] = [];
	private tabList: Tab<Q>[] = [];
	private filtersInMode: string | null = null;
	private recordUrlFn?: (row: Row) => unknown;
	private queryFn?: () => Q;
	private perPage = 25;
	private perPageOptions = [10, 25, 50, 100];
	private simple = false;

	constructor(readonly name: string) {}

	/** Column builders, or `{name: "Label"}` shorthand for text columns (alone or in the list). */
	columns(columns: ColumnEntry[] | Record<string, string>): this {
		for (const entry of Array.isArray(columns) ? columns : [columns]) {
			this.columnList.push(...toColumns(entry));
		}
		for (const col of this.columnList) {
			if (col.isEditable() && col.st.onSave === undefined) {
				throw new Error(`Editable column "${col.name}" requires ->onSave() to be set.`);
			}
		}
		assertUniqueNames(this.columnList);
		assertStickyColumnsLead(this.columnList);
		return this;
	}

	/** Table-level search fields; unions with Column::searchable(). */
	searchable(fields: string[]): this {
		this.searchList = fields;
		this.opts.searchable = fields;
		return this;
	}

	/** Filter fields; a modal unless filtersIn('inline'). */
	filters(fields: Field[]): this {
		for (const field of fields) {
			if (field instanceof Select && field.creatableClosure() !== undefined) {
				throw new Error(
					`Table filter "${field.name}" on table "${this.name}" cannot use creatable(); select creation is only supported inside forms.`,
				);
			}
		}
		this.filterList = fields;
		this.filtersInMode ??= "modal";
		return this;
	}

	/**
	 * Predefined tabs; the first is the default. Pass a callback to get a `tab`
	 * factory typed with this table's query: `tabs((tab) => [tab("all")])`.
	 */
	tabs(tabs: Tab<Q>[] | ((tab: (name: string) => Tab<Q>) => Tab<Q>[])): this {
		if (typeof tabs === "function") {
			return this.tabs(tabs((name) => Tab.make<Q>(name)));
		}
		const seen = new Set<string>();
		for (const tab of tabs) {
			if (seen.has(tab.name)) {
				throw new Error(`Duplicate tab name "${tab.name}" on table "${this.name}".`);
			}
			seen.add(tab.name);
		}
		this.tabList = tabs;
		return this;
	}

	/**
	 * Where filters render: a modal, inline in the toolbar, or an aside panel
	 * left of the table that a toolbar button shows and hides (a side sheet
	 * below the lg breakpoint).
	 */
	filtersIn(mode: "modal" | "inline" | "aside"): this {
		if (!FILTERS_IN.includes(mode)) {
			throw new Error(`Invalid filters mode "${mode}". Allowed: ${FILTERS_IN.join(", ")}.`);
		}
		this.filtersInMode = mode;
		return this;
	}

	/**
	 * Start the aside filters panel hidden until the toolbar button opens it;
	 * the user's own toggle wins on later visits. Only for filtersIn('aside').
	 */
	filtersCollapsed(value = true): this {
		return this.set("filtersCollapsed", value);
	}

	/** Filters apply only on an explicit Apply. */
	deferFilters(value = true): this {
		return this.set("deferFilters", value);
	}

	/** Grid columns of the filters form (1-12). */
	filtersFormColumns(columns: number): this {
		if (columns < 1 || columns > 12) {
			throw new Error(`Invalid filters form columns "${columns}". Must be between 1 and 12.`);
		}
		return this.set("filtersFormColumns", columns);
	}

	/** Width of the filters modal: sm, md, lg, full. */
	filtersFormWidth(width: string): this {
		if (!FILTER_WIDTHS.includes(width)) {
			throw new Error(
				`Invalid filters form width "${width}". Allowed: ${FILTER_WIDTHS.join(", ")}.`,
			);
		}
		return this.set("filtersFormWidth", width);
	}

	/** Initial sort when the request has none. */
	defaultSort(field: string, dir: "asc" | "desc" = "asc"): this {
		return this.set("defaultSort", { field, dir });
	}

	/**
	 * Re-fetch the rows every `seconds`, keeping the current rows on screen with
	 * no loading overlay. The client pauses while the tab is hidden or rows are
	 * selected. Below the 5-second floor this throws; the client clamps too.
	 */
	poll(seconds: number): this {
		if (!Number.isInteger(seconds) || seconds < MIN_POLL_SECONDS) {
			throw new Error(`Table poll interval must be at least ${MIN_POLL_SECONDS} seconds.`);
		}
		return this.set("poll", seconds);
	}

	/**
	 * Group contiguous rows by a column under a header row; needs
	 * defaultSort(column) first. `collapsible` makes the header a toggle that
	 * hides or shows its rows; `collapsed` starts every group closed and
	 * implies `collapsible`.
	 */
	groups(column: string, opts: { collapsible?: boolean; collapsed?: boolean } = {}): this {
		if (this.defaultSortSpec()?.field !== column) {
			throw new Error(
				`groups("${column}") requires defaultSort("${column}", ...) to be set first.`,
			);
		}
		const groups: { column: string; collapsible?: true; collapsed?: true } = { column };
		if (opts.collapsible || opts.collapsed) {
			groups.collapsible = true;
		}
		if (opts.collapsed) {
			groups.collapsed = true;
		}
		return this.set("groups", groups);
	}

	/** Default page size and the sizes offered. */
	paginate(perPage = 25, options = [10, 25, 50, 100]): this {
		this.perPage = perPage;
		this.perPageOptions = options;
		return this;
	}

	/**
	 * Page without a total: no count() query, only previous/next in the footer.
	 * For large tables where count() is the slow query; tab counts still run.
	 */
	simplePagination(value = true): this {
		this.simple = value;
		return this;
	}

	/** Without toolbar and pagination footer, for embedding in a card. */
	embedded(value = true): this {
		return this.set("embedded", value);
	}

	/** Show/hide search input and column toggle together. */
	toolbar(value = true): this {
		this.opts.searchInput = value;
		return this.set("columnToggle", value);
	}

	/** Show/hide the search input. */
	searchInput(value = true): this {
		return this.set("searchInput", value);
	}

	/** Show/hide the column-visibility dropdown. */
	columnToggle(value = true): this {
		return this.set("columnToggle", value);
	}

	/** Per-row actions; wrap in dropdown() to collapse into a menu. */
	rowActions(actions: (ActionBuilder | Node)[]): this {
		return this.set("rowActions", actions);
	}

	/** Clicking a row triggers the named row action. */
	rowClick(actionName: string): this {
		return this.set("rowClick", actionName);
	}

	/** Search input placeholder. */
	searchPlaceholder(text: string): this {
		return this.set("searchPlaceholder", text);
	}

	/** Empty-table message. */
	emptyState(heading: string, description?: string, icon?: string): this {
		const state: Record<string, string> = { heading };
		if (description !== undefined) {
			state.description = description;
		}
		if (icon !== undefined) {
			state.icon = icon;
		}
		return this.set("emptyState", state);
	}

	/** Actions above the table, e.g. Create. */
	headerActions(actions: (ActionBuilder | Node)[]): this {
		return this.set("headerActions", actions);
	}

	/** Each row links to `(row) => url`. */
	recordUrl(resolver: (row: Row) => unknown): this {
		this.recordUrlFn = resolver;
		return this.set("recordUrl", true);
	}

	/** Open record URLs in a new tab. */
	openRecordUrlInNewTab(newTab = true): this {
		return this.set("recordUrlNewTab", newTab);
	}

	/** Drag-and-drop reordering persisted to a column, which becomes the default sort. */
	reorderable(column = "sort_order"): this {
		this.opts.reorder = { column };
		this.opts.defaultSort ??= { field: column, dir: "asc" };
		return this;
	}

	/** Actions for checked rows. */
	bulkActions(actions: (ActionBuilder | Node)[]): this {
		return this.set("bulkActions", actions);
	}

	/** The base query: `() => query`, a fresh one per call. Types the table's tabs by its result. */
	query<R extends Q>(fn: () => R): TableBuilder<R> {
		this.queryFn = fn;
		return this as unknown as TableBuilder<R>;
	}

	/** Escape hatch: writes a key straight into the table options. */
	set(key: string, value: unknown): this {
		this.opts[key] = value;
		return this;
	}

	toNode(): Node {
		const opts: Record<string, unknown> = { ...this.opts };
		for (const key of ["rowActions", "headerActions", "bulkActions"]) {
			if (Array.isArray(opts[key])) {
				opts[key] = (opts[key] as unknown[]).filter(includes);
			}
		}
		if (this.filterList.length > 0) {
			opts.filters = this.filterList.filter(includes).map((f) => f.toNode());
			opts.filtersIn = this.filtersInMode ?? "modal";
		}
		if (this.tabList.length > 0) {
			opts.tabs = this.tabList.map((t) => t.toWire());
		}
		const columns = this.visibleColumns()
			.filter(includes)
			.map((c) => c.toJSON());
		opts.pagination = this.paginationSpec();
		return new Node("table", { ...opts, name: this.name, columns }, this.name).when(
			this.isIncluded(),
		);
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	queryClosure(): (() => Q) | undefined {
		return this.queryFn;
	}

	recordUrlResolver(): ((row: Row) => unknown) | undefined {
		return this.recordUrlFn;
	}

	tabObjects(): Tab<Q>[] {
		return this.tabList;
	}

	findTab(name: string): Tab<Q> | null {
		return this.tabList.find((t) => t.name === name) ?? null;
	}

	defaultTab(): Tab<Q> | null {
		return this.tabList[0] ?? null;
	}

	filterFields(): Field[] {
		return this.filterList;
	}

	findQueryableSelectFilter(name: string): Select | null {
		const found = this.filterList.find(
			(f) =>
				f instanceof Select &&
				f.isIncluded() &&
				f.name === name &&
				f.queryClosure() !== undefined,
		);
		return (found as Select | undefined) ?? null;
	}

	allColumns(): Column[] {
		return this.columnList;
	}

	visibleColumns(): Column[] {
		return this.columnList.filter((c) => c.isVisible());
	}

	/** The declared column named `name`, a group child included. */
	findColumn(name: string): Column | null {
		const all = this.columnList.flatMap((c) => [c, ...c.groupColumns()]);
		return all.find((c) => c.name === name) ?? null;
	}

	/** Visible columns with each group replaced by its children: the ones that carry a value. */
	visibleLeafColumns(): Column[] {
		return this.visibleColumns().flatMap((c) =>
			c.groupColumns().length > 0 ? c.groupColumns() : [c],
		);
	}

	searchableFields(): string[] {
		return searchableNames(this.searchList, this.visibleColumns());
	}

	individuallySearchableColumns(): string[] {
		return this.visibleColumns()
			.filter((c) => c.isIndividuallySearchable())
			.map((c) => c.name);
	}

	translatableColumns(): string[] {
		return this.visibleLeafColumns()
			.filter((c) => c.isTranslatable())
			.map((c) => c.name);
	}

	/** Group children unfold: the client sorts a group header by its first sortable child. */
	sortableColumnNames(): string[] {
		return this.visibleLeafColumns()
			.filter((c) => c.isSortable())
			.map((c) => c.name);
	}

	defaultSortSpec(): { field: string; dir: "asc" | "desc" } | null {
		return (
			(this.opts.defaultSort as { field: string; dir: "asc" | "desc" } | undefined) ?? null
		);
	}

	reorderColumn(): string | null {
		return (this.opts.reorder as { column: string } | undefined)?.column ?? null;
	}

	getGroupsColumn(): string | null {
		return (this.opts.groups as { column: string } | undefined)?.column ?? null;
	}

	paginationSpec(): { perPage: number; options: number[]; simple?: true } {
		const spec = { perPage: this.perPage, options: this.perPageOptions };
		return this.simple ? { ...spec, simple: true } : spec;
	}

	isSimplePagination(): boolean {
		return this.simple;
	}

	optionValue(key: string): unknown {
		return this.opts[key];
	}
}
export interface TableBuilder<Q = unknown> extends HasWhen {}
mixin(TableBuilder, [HasWhen]);

function toColumns(entry: ColumnEntry): Column[] {
	if (entry instanceof Column) {
		return [entry];
	}
	return Object.entries(entry).map(([name, label]) =>
		Column.make(name).label(label).kind("text"),
	);
}

function assertUniqueNames(columns: Column[]): void {
	const seen = new Set<string>();
	for (const name of columns.flatMap((c) => [c.name, ...c.groupColumns().map((g) => g.name)])) {
		if (seen.has(name)) {
			throw new Error(`Duplicate column name "${name}".`);
		}
		seen.add(name);
	}
}

/**
 * Sticky columns stack from the left edge, so they lead the column list; a
 * pinned column after a scrolling one would slide over it. Inside a group the
 * group itself is the column that pins.
 */
function assertStickyColumnsLead(columns: Column[]): void {
	let leading = true;
	for (const col of columns) {
		const child = col.groupColumns().find((c) => c.isSticky());
		if (child !== undefined) {
			throw new Error(
				`Column "${child.name}": sticky() goes on the group "${col.name}", not on its children.`,
			);
		}
		if (col.isSticky() && !leading) {
			throw new Error(`Column "${col.name}": sticky columns must come first in columns().`);
		}
		leading = leading && col.isSticky();
	}
}
