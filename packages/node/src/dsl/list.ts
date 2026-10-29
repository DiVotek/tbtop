import { resolvedMeta } from "./meta";
import { mixin, WithMeta } from "./mixin";
import { Node } from "./node";

const COLORS = ["success", "warning", "danger", "muted"];

export type ListRow = {
	title: string;
	meta?: string;
	color?: string;
	url?: string;
	openUrlInNewTab?: boolean;
};

/** One row of list()->items(), fluent (ListItem.php); the array form stays first-class. */
export class ListItem {
	private row: Omit<ListRow, "title"> = {};

	constructor(readonly title: string) {}

	/** Muted secondary text on the right (e.g. "2h ago"). */
	meta(meta: string): this {
		this.row.meta = meta;
		return this;
	}

	/** Status dot color: success|warning|danger|muted. */
	color(color: string): this {
		this.row.color = color;
		return this;
	}

	/** Make the row a link. */
	url(url: string): this {
		this.row.url = url;
		return this;
	}

	/** Open url() in a new tab. No effect without url(). */
	openUrlInNewTab(condition = true): this {
		this.row.openUrlInNewTab = condition;
		return this;
	}

	toArray(): ListRow {
		return { title: this.title, ...this.row };
	}
}

/** "Recently updated" style row list; items resolve at serialization (ListBuilder.php). */
export class ListBuilder {
	private itemsFn?: () => (ListRow | ListItem)[] | Promise<(ListRow | ListItem)[]>;
	private metaBag: Record<string, unknown> = {};

	constructor(readonly name: string) {}

	/** Row source: `() => rows`, each a `{title, meta?, color?, url?}` or a listItem(). */
	items(fn: () => (ListRow | ListItem)[] | Promise<(ListRow | ListItem)[]>): this {
		this.itemsFn = fn;
		return this;
	}

	toNode(): Node {
		return new Node(
			"list",
			{ items: this.resolveItems() },
			this.name,
			resolvedMeta(this.metaBag),
		);
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private async resolveItems(): Promise<Record<string, unknown>[]> {
		const items = this.itemsFn === undefined ? [] : await this.itemsFn();
		return items.map(normalizeItem);
	}
}

export interface ListBuilder extends WithMeta {}
mixin(ListBuilder, [WithMeta]);

function normalizeItem(entry: ListRow | ListItem): Record<string, unknown> {
	const item = entry instanceof ListItem ? entry.toArray() : entry;
	if (item.title === undefined || item.title === null) {
		throw new Error('List item requires a "title" key.');
	}
	const out: Record<string, unknown> = { title: String(item.title) };
	if (item.meta !== undefined) {
		out.meta = String(item.meta);
	}
	if (item.color !== undefined) {
		if (!COLORS.includes(item.color)) {
			throw new Error(
				`Invalid list item color "${item.color}". Allowed: ${COLORS.join(", ")}.`,
			);
		}
		out.color = item.color;
	}
	if (item.url !== undefined) {
		out.url = String(item.url);
		if (item.openUrlInNewTab === true) {
			out.newTab = true;
		}
	}
	return out;
}
