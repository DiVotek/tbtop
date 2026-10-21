import type { Action } from "./actions";
import { type Buildable, compact, node, toWire, type WireNode } from "./node";

export class Column {
	private opts: Record<string, unknown> = {};
	/** Server-side cell formatter (formatUsing). Never serialized. */
	formatter?: (value: unknown, row: Record<string, unknown>) => unknown;

	constructor(readonly name: string) {}

	label(label: string): this {
		this.opts.label = label;
		return this;
	}

	kind(kind: "text" | "number" | "date" | "boolean" | "badge" | "time"): this {
		this.opts.kind = kind;
		return this;
	}

	date(format: string): this {
		return this.kind("date").set("format", format);
	}

	badge(map: Record<string, { label?: string; color?: string }>): this {
		const colors = Object.fromEntries(
			Object.entries(map).flatMap(([k, v]) => (v.color ? [[k, v.color]] : [])),
		);
		const labels = Object.fromEntries(
			Object.entries(map).flatMap(([k, v]) => (v.label ? [[k, v.label]] : [])),
		);
		return this.kind("badge").set("badge", { colors, labels });
	}

	sortable(): this {
		return this.set("sortable", true);
	}

	searchable(): this {
		return this.set("searchable", true);
	}

	align(align: "left" | "center" | "right"): this {
		return this.set("align", align);
	}

	format(fn: (value: unknown, row: Record<string, unknown>) => unknown): this {
		this.formatter = fn;
		return this;
	}

	set(key: string, value: unknown): this {
		this.opts[key] = value;
		return this;
	}

	toJSON(): Record<string, unknown> {
		return { name: this.name, ...this.opts };
	}
}

/** What the host's row source receives: already clamped and whitelisted. */
export interface TableQuery {
	page: number;
	perPage: number;
	sort?: { field: string; dir: "asc" | "desc" };
	search?: { text: string; fields: string[] };
	filters: Record<string, unknown>;
	tab?: string;
}

export interface TableRows {
	rows: Record<string, unknown>[];
	total: number;
}

/**
 * ORM-agnostic: instead of an Eloquent builder, a table asks the host for one
 * page of rows. Adapters (Drizzle, Kysely, Prisma) are thin wrappers over this.
 */
export type RowSource = (
	query: TableQuery,
	ctx: { params: Record<string, string>; request: Request },
) => Promise<TableRows>;

export class Table implements Buildable {
	private opts: Record<string, unknown> = {};
	private cols: Column[] = [];
	private rowActionList: Action[] = [];
	private bulkActionList: Action[] = [];
	private perPageDefault = 25;
	private perPageOptions = [10, 25, 50, 100];
	private keyField = "id";
	source?: RowSource;

	constructor(readonly name: string) {}

	columns(columns: Column[]): this {
		this.cols = columns;
		return this;
	}

	getColumns(): Column[] {
		return this.cols;
	}

	rowActions(actions: Action[]): this {
		this.rowActionList = actions;
		return this;
	}

	bulkActions(actions: Action[]): this {
		this.bulkActionList = actions;
		return this;
	}

	paginate(perPage: number, options = [10, 25, 50, 100]): this {
		this.perPageDefault = perPage;
		this.perPageOptions = options;
		return this;
	}

	defaultSort(field: string, dir: "asc" | "desc" = "asc"): this {
		this.opts.defaultSort = { field, dir };
		return this;
	}

	rowClick(action: string): this {
		this.opts.rowClick = action;
		return this;
	}

	key(field: string): this {
		this.keyField = field;
		return this;
	}

	rows(source: RowSource): this {
		this.source = source;
		return this;
	}

	pagination(): { perPage: number; options: number[] } {
		return { perPage: this.perPageDefault, options: this.perPageOptions };
	}

	recordKey(row: Record<string, unknown>): unknown {
		return row[this.keyField];
	}

	searchableFields(): string[] {
		return this.cols.filter((c) => c.toJSON().searchable === true).map((c) => c.name);
	}

	sortableFields(): string[] {
		return this.cols.filter((c) => c.toJSON().sortable === true).map((c) => c.name);
	}

	defaultSortSpec(): { field: string; dir: "asc" | "desc" } | undefined {
		return this.opts.defaultSort as { field: string; dir: "asc" | "desc" } | undefined;
	}

	walkChildren(): readonly unknown[] {
		return [...this.rowActionList, ...this.bulkActionList];
	}

	toNode(): WireNode {
		const searchable = this.searchableFields();
		return node(
			"table",
			compact({
				...(searchable.length > 0 ? { searchable } : {}),
				...this.opts,
				rowActions:
					this.rowActionList.length > 0 ? this.rowActionList.map(toWire) : undefined,
				bulkActions:
					this.bulkActionList.length > 0 ? this.bulkActionList.map(toWire) : undefined,
				pagination: this.pagination(),
				name: this.name,
				columns: this.cols.map((c) => c.toJSON()),
			}),
			{ name: this.name },
		);
	}
}
