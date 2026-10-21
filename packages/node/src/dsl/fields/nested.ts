import { Affixes } from "./affix";
import { DatabaseRules, Dependencies, mixin } from "./concerns";
import { Field } from "./field";

const DEFAULT_SEARCH_LIMIT = 50;

/** Rows of sub-fields; may nest another repeater (Repeater.php). */
export class Repeater<N extends string = string, R = Record<string, unknown>> extends Field<
	N,
	R[] | null
> {
	readonly kind = "repeater";

	/** The sub-fields making up one row. */
	fields(fields: unknown[]): this {
		return this.set("fields", fields);
	}

	/** Client-enforced cap on row count. */
	maxItems(max: number): this {
		return this.set("maxItems", max);
	}

	/** Client-enforced floor on row count. */
	minItems(min: number): this {
		return this.set("minItems", min);
	}

	/** Rows seeded when the record has no key for this repeater. */
	defaultItems(count: number): this {
		return this.set("defaultItems", count);
	}

	defaultItemCount(): number {
		const count = this.optionValue("defaultItems");
		return Number.isInteger(count) ? (count as number) : 0;
	}

	/** Collapse each row to a one-line summary; click to expand. */
	collapsible(collapsible = true): this {
		return this.set("collapsible", collapsible);
	}

	/** Sub-field whose value titles a collapsed row. */
	summary(field: string): this {
		return this.set("summary", field);
	}
}

export type RelationQuery = (deps: Record<string, string>) => unknown;

/** Pick a related record by key, searching its label column (Relation.php). */
export class Relation<N extends string = string> extends Field<N, string | number | null> {
	readonly kind = "relation";
	private queryFn?: RelationQuery;
	private limit: number | null = null;

	/** Type-ahead over the relation-search endpoint. */
	searchable(value = true): this {
		return this.set("searchable", value);
	}

	/** Column used as the display label (default 'name'). */
	labelKey(column: string): this {
		return this.set("labelKey", column);
	}

	/** The records to pick from: `(deps) => query`, searched and capped by the endpoint. */
	query(fn: RelationQuery): this {
		this.queryFn = fn;
		return this;
	}

	/** Caps how many rows the search endpoint returns. */
	searchLimit(max: number): this {
		this.limit = max;
		return this;
	}

	getLabelKey(): string {
		return String(this.optionValue("labelKey") ?? "name");
	}

	getSearchLimit(): number {
		return this.limit !== null && this.limit > 0 ? this.limit : DEFAULT_SEARCH_LIMIT;
	}

	queryClosure(): RelationQuery | undefined {
		return this.queryFn;
	}
}
export interface Relation<N extends string = string> extends Affixes, DatabaseRules, Dependencies {}
mixin(Relation, [Affixes, DatabaseRules, Dependencies]);
