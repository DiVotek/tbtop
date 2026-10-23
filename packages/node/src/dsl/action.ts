// oxlint-disable max-lines -- DSL builder: fluent method lists are exempt (CLAUDE.md)
import type { ActionCtx, ActionHandler, Need } from "./actionCtx";
import { currentContext } from "./context";
import { HasWhen, mixin, WithMeta } from "./mixin";
import { includes, Node } from "./node";

const MODAL_SIZES = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "full"];
const BUTTON_SIZES = ["sm", "md", "lg"];
const SPEC_METHODS: Record<string, string> = {
	visit: "url",
	submit: "submit",
	server: "handle",
	modal: "modal",
	custom: "custom",
};

export type ModalQuery = (ctx: ActionCtx) => unknown;
type Spec = Record<string, unknown> & { type: string };

/** One action; exactly one spec: url | submit | handle | modal | custom (ActionBuilder.php). */
export class ActionBuilder {
	private opts: Record<string, unknown> = {};
	private tail: Record<string, unknown> = {};
	private spec: Spec | null = null;
	private handlerFn?: ActionHandler;
	private queryFn?: ModalQuery;
	private queryNeeds: Need[] = [];
	private modalSize: string | null = null;
	private slideOverValue = false;
	private skipValidation = false;
	private newTab = false;
	private ability: { name: string; args: unknown[] } | null = null;
	private mcpEnabled = true;
	private metaBag: Record<string, unknown> = {};

	constructor(readonly name: string) {}

	/** Button/link text. */
	label(label: string): this {
		return this.opt("label", label);
	}

	/** Trigger tint, e.g. 'danger' for a destructive action. */
	color(color: string): this {
		return this.opt("color", color);
	}

	/** Count badge after the label, optionally tinted. */
	badge(count: string | number, color?: string): this {
		this.opts.badge = String(count);
		if (color !== undefined) {
			this.opts.badgeColor = color;
		}
		return this;
	}

	/** Keyboard shortcut, e.g. 'mod+s'. */
	keybinding(keys: string): this {
		return this.opt("keybinding", keys);
	}

	/** Navigation spec; `{row.*}` templates resolve per row. */
	url(href: string): this {
		return this.setSpec({ type: "visit", href });
	}

	/** Open url() in a new tab. */
	openUrlInNewTab(condition = true): this {
		this.newTab = condition;
		return this;
	}

	/** Submit spec: the enclosing form, or another form by name. */
	submit(form?: string): this {
		return this.setSpec(form ? { type: "submit", form } : { type: "submit" });
	}

	/** Server spec: the handler gets the declared payload: 'form', 'row', 'selection'. */
	handle<F = Record<string, unknown>>(handler: ActionHandler<F>, needs: Need[] = []): this {
		this.handlerFn = handler as ActionHandler;
		return this.setSpec({ type: "server", needs });
	}

	/** The enclosing form's rules filter keys but no longer block this action. */
	withoutValidation(without = true): this {
		this.skipValidation = without;
		return this;
	}

	/** A confirmation dialog before the action fires; composes with any spec. */
	confirm(title: string, description?: string): this {
		return this.opt("confirm", description ? { title, description } : { title });
	}

	/** Modal spec: a body (a form collects input) and an optional description. */
	modal(title: string, body?: unknown, description?: string): this {
		const spec: Spec = { type: "modal", title };
		if (description) {
			spec.description = description;
		}
		if (body !== undefined && body !== null && includes(body)) {
			spec.body = body;
		}
		return this.setSpec(spec);
	}

	/** Modal width: sm … 7xl, full. */
	modalWidth(width: string): this {
		if (!MODAL_SIZES.includes(width)) {
			throw new Error(`Invalid modal width "${width}". Allowed: ${MODAL_SIZES.join(", ")}.`);
		}
		this.modalSize = width;
		return this;
	}

	/** Render the modal as a right-anchored slide-over. */
	slideOver(slideOver = true): this {
		this.slideOverValue = slideOver;
		return this;
	}

	/** Gate check: a failing ability drops the action and is re-checked on dispatch. */
	authorize(ability: string, ...args: unknown[]): this {
		this.ability = { name: ability, args };
		return this;
	}

	/** Trigger size: sm, md, lg. */
	size(size: string): this {
		if (!BUTTON_SIZES.includes(size)) {
			throw new Error(`Invalid button size "${size}". Allowed: ${BUTTON_SIZES.join(", ")}.`);
		}
		return this.opt("size", size);
	}

	/** Outlined trigger. */
	outlined(outlined = true): this {
		return this.opt("outlined", outlined);
	}

	/** Trigger styled as a link. */
	link(): this {
		return this.opt("as", "link");
	}

	/** Trigger styled as a button (the default). */
	button(): this {
		return this.opt("as", "button");
	}

	/** Client-side handler registered with defineCustomAction(). */
	custom(handler: string, params: Record<string, unknown> = {}): this {
		return this.setSpec({ type: "custom", handler, params });
	}

	/** Modal data source, run when the modal opens: `(ctx) => data`. */
	query(fn: ModalQuery, needs: Need[] = ["row"]): this {
		this.queryFn = fn;
		this.queryNeeds = needs;
		return this;
	}

	/** Lucide icon name, left (default) or right of the label. */
	icon(name: string, position: "left" | "right" = "left"): this {
		if (position !== "left" && position !== "right") {
			throw new Error(`Invalid icon position "${String(position)}". Allowed: left, right.`);
		}
		this.tail.icon = { name, position };
		return this;
	}

	/** Tooltip shown on hover. */
	tooltip(text: string): this {
		this.tail.tooltip = text;
		return this;
	}

	/** Hide from the panel's MCP server. */
	mcp(enabled = true): this {
		this.mcpEnabled = enabled;
		return this;
	}

	isAuthorized(): boolean {
		return this.ability === null || currentContext().can(this.ability.name, this.ability.args);
	}

	isMcpEnabled(): boolean {
		return this.mcpEnabled;
	}

	getSpec(): Spec | null {
		return this.spec;
	}

	getQueryNeeds(): Need[] {
		return this.queryNeeds;
	}

	handler(): ActionHandler | undefined {
		return this.handlerFn;
	}

	queryClosure(): ModalQuery | undefined {
		return this.queryFn;
	}

	skipsFormValidation(): boolean {
		return this.skipValidation && this.spec !== null && consumesForm(this.spec);
	}

	toNode(): Node {
		if (this.spec === null) {
			throw new Error(`Action "${this.name}" needs one of url/submit/handle/modal/custom.`);
		}
		const spec = this.finalSpec(this.spec);
		const options = { ...this.opts, ...this.tail, spec };
		return new Node("action", options, this.name, this.metaBag).when(this.isIncluded());
	}

	toJSON(): unknown {
		return this.toNode().toJSON();
	}

	private finalSpec(base: Spec): Spec {
		let spec: Spec = { ...base };
		const modalOnly = (what: string) => {
			if (spec.type !== "modal") {
				throw new Error(
					`${what}() is only valid on modal actions (action "${this.name}").`,
				);
			}
		};
		if (this.modalSize !== null) {
			modalOnly("modalWidth");
			spec = { ...spec, size: this.modalSize };
		}
		if (this.slideOverValue) {
			modalOnly("slideOver");
			spec = { ...spec, slideOver: true };
		}
		if (this.queryFn !== undefined) {
			modalOnly("query");
			spec = { ...spec, query: true, queryNeeds: this.queryNeeds };
		}
		if (this.newTab && spec.type === "visit") {
			spec = { ...spec, newTab: true };
		}
		return this.skipValidation && consumesForm(spec) ? { ...spec, validate: false } : spec;
	}

	private opt(key: string, value: unknown): this {
		this.opts[key] = value;
		return this;
	}

	private setSpec(spec: Spec): this {
		if (this.spec !== null) {
			throw new Error(
				`Action "${this.name}" already has a spec (${SPEC_METHODS[this.spec.type]}).`,
			);
		}
		this.spec = spec;
		return this;
	}
}
export interface ActionBuilder extends HasWhen, WithMeta {}
mixin(ActionBuilder, [HasWhen, WithMeta]);

function consumesForm(spec: Spec): boolean {
	return spec.type === "server" && Array.isArray(spec.needs) && spec.needs.includes("form");
}
