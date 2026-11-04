import type { PageDef } from "../page";
import { findPage, type Resolved, resolvePage } from "../resolve";
import { AgentError } from "./answer";

/**
 * The panel's pages as the MCP server sees them (PanelPages.php): a page with
 * `mcp: false` does not exist here. A page's id is its path.
 */
export class McpPages {
	constructor(
		private readonly pages: PageDef[],
		readonly prefix: string,
		/** Scheme and host the page and endpoint requests a handler sees are built on. */
		readonly origin: string,
	) {}

	all(): PageDef[] {
		// Public pages (login, password reset) are for guests, never for agents (AuthPage::mcp()).
		return this.pages.filter((page) => page.mcp ?? page.public !== true);
	}

	find(id: string): PageDef {
		const found = this.all().find((page) => page.path === id);
		if (found === undefined) {
			throw new AgentError(`Unknown page "${id}". Call search() to list pages.`);
		}
		return found;
	}

	/** The URL of `page` (plus `tail`, an endpoint) under the panel. */
	url(page: PageDef, params: Record<string, string>, tail = ""): string {
		const path = page.path
			.split("/")
			.map((segment) =>
				segment.startsWith("$")
					? encodeURIComponent(params[segment.slice(1)] ?? "")
					: segment,
			)
			.join("/");
		return `${this.origin}${this.prefix}/${path}${tail}`;
	}

	/** Builds the page behind its own gate: view() may load a record a denied user must not reach. */
	resolve(page: PageDef, params: Record<string, string>): Promise<Resolved> {
		return resolvePage(page, { params, request: new Request(this.url(page, params)) });
	}

	/** The page and params a panel URL opens, so an agent can search() it next; {} otherwise. */
	locate(href: string): { page?: string; params?: Record<string, string> } {
		const { pathname } = new URL(href, this.origin);
		if (!pathname.startsWith(`${this.prefix}/`)) {
			return {};
		}
		const found = findPage(this.all(), pathname.slice(this.prefix.length + 1));
		if (found === null) {
			return {};
		}
		const { page, params } = found;
		return Object.keys(params).length === 0 ? { page: page.path } : { page: page.path, params };
	}
}

/** `posts/$post/edit` → `["post"]`. */
export function pathParams(page: PageDef): string[] {
	return page.path
		.split("/")
		.filter((segment) => segment.startsWith("$"))
		.map((segment) => segment.slice(1));
}

/** The page's own route params out of `params`; a missing one is an agent error. */
export function routeParams(
	page: PageDef,
	params: Record<string, unknown>,
): Record<string, string> {
	const names = pathParams(page);
	const out: Record<string, string> = {};
	for (const name of names) {
		const value = params[name];
		if (!["string", "number"].includes(typeof value) || String(value) === "") {
			throw new AgentError(`Page "${page.path}" needs params: ${names.join(", ")}.`);
		}
		out[name] = String(value);
	}
	return out;
}
