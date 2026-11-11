import type { Effects } from "./effects";

export type Need = "form" | "row" | "selection";

/** What a server handler receives (ActionCtx.php). */
export class ActionCtx<F = Record<string, unknown>> {
	constructor(
		readonly request: Request,
		readonly data: {
			user?: unknown;
			form?: F;
			selection?: (string | number)[];
			row?: Record<string, unknown>;
			params?: Record<string, string>;
			/** The user picked every row matching the table's state, not just the checked ones. */
			allMatching?: boolean;
			/** Builds the query records() returns; set for a table's bulk actions. */
			records?: () => unknown;
		},
	) {}

	get user(): unknown {
		return this.data.user ?? null;
	}

	/** The validated form payload when the action declared needs: ['form']. */
	get form(): F {
		return (this.data.form ?? {}) as F;
	}

	get selection(): (string | number)[] {
		return this.data.selection ?? [];
	}

	get row(): Record<string, unknown> {
		return this.data.row ?? {};
	}

	get params(): Record<string, string> {
		return this.data.params ?? {};
	}

	/** True when the user picked every row matching the table's tab, search and filters. */
	get allMatching(): boolean {
		return this.data.allMatching === true;
	}

	/**
	 * The selected records as a fresh query (your driver's `Q`) on the table's
	 * own query: the checked keys, or every matching row when `allMatching`.
	 * Prefer it over `selection` for large selections. Only a table's bulk
	 * actions have it; anywhere else it throws.
	 */
	records<Q = unknown>(): Q {
		if (this.data.records === undefined) {
			throw new Error(
				"ActionCtx.records() is only available to a table's bulk actions (needs: ['selection']).",
			);
		}
		return this.data.records() as Q;
	}

	/** The selection resolved against its table: the keys acted on and the records() query. */
	withRecords(
		selection: (string | number)[],
		allMatching: boolean,
		records: () => unknown,
	): ActionCtx<F> {
		return new ActionCtx<F>(this.request, { ...this.data, selection, allMatching, records });
	}

	/** The clicked row's key: `_key`, then `id`; null without a row. */
	key(): string | number | null {
		const key = this.row._key ?? this.row.id ?? null;
		return typeof key === "string" || typeof key === "number" ? key : null;
	}

	withForm<G>(form: G): ActionCtx<G> {
		return new ActionCtx<G>(this.request, { ...this.data, form });
	}
}

export type HandlerResult = Effects | string | null | undefined | void;
export type ActionHandler<F = Record<string, unknown>> = (
	ctx: ActionCtx<F>,
) => HandlerResult | Promise<HandlerResult>;
