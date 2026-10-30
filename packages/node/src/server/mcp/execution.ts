import { materialize } from "../../dsl";
import type { ServerOptions } from "../endpoints";
import { runActionWith, submitFormOutcome } from "../endpoints/forms";
import { trimInput } from "../endpoints/input";
import type { EndpointCtx } from "../endpoints/types";
import { asJson, invalid } from "../http";
import type { SessionStore } from "../inertia/session";
import type { PageDef } from "../page";
import type { Resolved } from "../resolve";
import type { McpPages } from "./pages";

/** A session nothing outlives: MCP is stateless, and the handlers still read and write one. */
function scratchSession(): SessionStore {
	const values = new Map<string, unknown>();
	return {
		get: (key) => values.get(key),
		set: (key, value) => void values.set(key, value),
		forget: (key) => void values.delete(key),
	};
}

export interface ExecutionTarget {
	pages: McpPages;
	page: PageDef;
	params: Record<string, string>;
	resolved: Resolved;
	options: ServerOptions;
}

/**
 * Execution.php: an action or onSubmit form through the same code the browser
 * reaches (gate, reachability, validation), on a request bound to its endpoint URL.
 */
export class Execution {
	/** One scratch session per execute(): a file fetched before it is issued on the same one. */
	readonly session = scratchSession();

	constructor(private readonly target: ExecutionTarget) {}

	private ctx(tail: string, body: unknown): EndpointCtx {
		const { pages, page, params, resolved, options } = this.target;
		const request = new Request(pages.url(page, params, tail), {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json" },
			body: JSON.stringify(body),
		});
		return { resolved, request, args: [], options, session: this.session };
	}

	/** `payload` is `{form?, row?, selection?}`; a redirect effect gains the page it opens. */
	async action(name: string, input: Record<string, unknown>) {
		const payload = trimInput(input, this.target.options);
		const ctx = this.ctx(`/actions/${encodeURIComponent(name)}`, { payload });
		const { effects } = await runActionWith(ctx, name, payload);
		const wire = asJson<unknown>(await materialize(effects));
		return { ok: true, effects: Array.isArray(wire) ? wire.map((e) => this.locate(e)) : wire };
	}

	/** Effects as the form flashes them; a handler that returns a URL is reported as `redirect`. */
	async form(name: string, input: Record<string, unknown>) {
		const data = trimInput(input, this.target.options);
		const ctx = this.ctx(`/forms/${encodeURIComponent(name)}`, data);
		const outcome = await submitFormOutcome(ctx, name, data);
		if ("errors" in outcome) {
			throw invalid(outcome.errors);
		}
		if ("effects" in outcome) {
			return { ok: true, effects: outcome.effects };
		}
		return {
			ok: true,
			redirect: outcome.redirect,
			...this.target.pages.locate(outcome.redirect),
		};
	}

	private locate(effect: unknown): unknown {
		const redirect = effect as { kind?: unknown; href?: unknown } | null;
		if (redirect?.kind !== "redirect" || typeof redirect.href !== "string") {
			return effect;
		}
		return { ...redirect, ...this.target.pages.locate(redirect.href) };
	}
}
