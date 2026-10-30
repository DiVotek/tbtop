import { check, fail } from "./assert";
import type { Bag } from "./visit";
import * as wire from "./wire";

type Column = { name?: string; sortable?: boolean; searchable?: boolean };

/** What a table node declares: the columns, filters, tabs and sorts a query may use. */
export class TableShape {
	/** The page did not render, so the declarations are unknown: queries go out unchecked. */
	private readonly blind: boolean;

	constructor(
		private readonly name: string,
		private readonly node: wire.WireNode,
		rendered: boolean,
	) {
		this.blind = !rendered;
	}

	searchable(): void {
		if (this.blind) {
			return;
		}
		const columns = this.columns().filter((c) => c.searchable === true);
		check(
			Boolean(this.options().searchable) || columns.length > 0,
			`Table [${this.name}] is not searchable.`,
		);
	}

	filter(name: string): void {
		if (this.blind) {
			return;
		}
		const filters = wire.nodes([this.options().filters ?? []]);
		if (!filters.some((e) => e.node.name === name)) {
			fail(
				`Table [${this.name}] has no filter [${name}]. Filters: ${wire.nameList(filters)}.`,
			);
		}
	}

	sortable(column: string): void {
		if (this.blind) {
			return;
		}
		this.column(column);
		const sortable = this.columns().some((c) => c.name === column && c.sortable === true);
		const fallback =
			(this.options().defaultSort as { field?: string } | undefined)?.field === column;
		if (!sortable && !fallback) {
			fail(
				`Column [${column}] of table [${this.name}] is not sortable: the server would ignore the sort.`,
			);
		}
	}

	tab(name: string): void {
		if (this.blind) {
			return;
		}
		const tabs = ((this.options().tabs ?? []) as { name?: string }[]).map((t) => t.name);
		if (!tabs.includes(name)) {
			fail(
				`Table [${this.name}] has no tab [${name}]. Tabs: ${tabs.length === 0 ? "none" : tabs.join(", ")}.`,
			);
		}
	}

	/** The column is on the wire. */
	column(name: string): void {
		if (this.blind) {
			return;
		}
		if (!this.columnNames().includes(name)) {
			fail(
				`Table [${this.name}] has no visible column [${name}]. Columns: ${this.columnNames().join(", ")}.`,
			);
		}
	}

	columnNames(): string[] {
		return this.columns().flatMap((c) => (typeof c.name === "string" ? [c.name] : []));
	}

	private columns(): Column[] {
		const columns = this.options().columns;
		return Array.isArray(columns) ? (columns as Column[]) : [];
	}

	private options(): Bag {
		return this.node.options ?? {};
	}
}
