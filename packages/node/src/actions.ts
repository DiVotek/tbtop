import type { Effects } from "./effects";
import { type Buildable, compact, node, type WireNode } from "./node";

export type Need = "form" | "row" | "selection";

/** What a server handler receives (ActionCtx.php). */
export interface ActionCtx<F = Record<string, unknown>> {
	/** Validated form payload, when the action sits in a form and needs it. */
	form: F;
	row: Record<string, unknown>;
	selection: (string | number)[];
	params: Record<string, string>;
	request: Request;
}

export type HandlerResult = Effects | string | void;
export type ActionHandler<F = Record<string, unknown>> = (
	ctx: ActionCtx<F>,
) => HandlerResult | Promise<HandlerResult>;

type Spec =
	| { type: "submit" }
	| { type: "visit"; href: string; newTab?: true }
	| { type: "server"; needs: Need[] };

export class Action implements Buildable {
	private opts: Record<string, unknown> = {};
	private spec: Spec = { type: "server", needs: [] };
	private needList: Need[] = [];
	private hidden: Record<string, unknown> = {};
	/** Server closure. Never serialized: re-resolved by name per request. */
	handler?: ActionHandler;
	/** Set by the enclosing form so `needs('form')` validates against its rules. */
	form?: { name: string };

	constructor(readonly name: string) {}

	label(label: string): this {
		this.opts.label = label;
		return this;
	}

	color(color: "primary" | "danger" | "warning" | "success" | "gray"): this {
		this.opts.color = color;
		return this;
	}

	icon(name: string, position: "left" | "right" = "left"): this {
		this.opts.icon = { name, position };
		return this;
	}

	confirm(title: string, description?: string): this {
		this.opts.confirm = compact({ title, description });
		return this;
	}

	url(href: string, newTab = false): this {
		this.spec = newTab ? { type: "visit", href, newTab: true } : { type: "visit", href };
		return this;
	}

	/** Submits the enclosing form to its `onSubmit`. */
	submit(): this {
		this.spec = { type: "submit" };
		return this;
	}

	needs(...needs: Need[]): this {
		this.needList = needs;
		return this;
	}

	hiddenIf(field: string, op: "eq" | "neq" | "truthy", value?: unknown): this {
		this.hidden = { hiddenIf: compact({ op, field, value }) };
		return this;
	}

	handle<F = Record<string, unknown>>(handler: ActionHandler<F>): this {
		this.handler = handler as ActionHandler;
		this.spec = { type: "server", needs: this.needList };
		return this;
	}

	toNode(): WireNode {
		const spec =
			this.spec.type === "server" ? { type: "server", needs: this.needList } : this.spec;
		return node(
			"action",
			{ ...this.opts, spec },
			{ name: this.name, meta: { ...this.hidden } },
		);
	}
}
