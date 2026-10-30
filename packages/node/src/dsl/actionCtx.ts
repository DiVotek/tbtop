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
