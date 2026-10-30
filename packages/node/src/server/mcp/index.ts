import type { PageDef } from "../page";
import { McpPages } from "./pages";
import { rpcError, serveRpc } from "./rpc";
import { INSTRUCTIONS } from "./schemas";
import { mcpTools, type ToolEnv } from "./tools";

/**
 * The panel's MCP server (PanelConfig::mcp()). Its auth replaces the panel's:
 * the session gate does not run, so `authenticate` reads the agent's token
 * and repeats the panel's role checks. A page's own rule stays in `authorize`.
 */
export interface McpConfig {
	/** The user the agent acts as, from its token; null/undefined answers 401. */
	authenticate: (request: Request) => unknown;
	/** Under the panel prefix; default `mcp`. */
	path?: string;
	/** Browser origins that may call the endpoint, your own included; a request without Origin passes. */
	allowedOrigins?: string[];
	/** Where unexpected tool failures go; default console.error. The agent gets a generic message. */
	report?: (error: unknown) => void;
	/**
	 * Fetches a `{url}` an agent sends for an upload field; without it upload
	 * fields are excluded. The host owns the SSRF policy here (private ranges,
	 * redirects, DNS pinning): a Worker's fetch() cannot pin DNS, so the
	 * runtime ships no guard of its own.
	 */
	fetchRemote?: (url: string) => Promise<Response>;
}

export function mcpPath(config: McpConfig): string {
	return (config.path ?? "mcp").replaceAll(/^\/+|\/+$/g, "");
}

/** A page at the MCP path would never be reachable. */
export function assertNoCollision(config: McpConfig, pages: PageDef[]): void {
	const path = mcpPath(config);
	const page = pages.find((candidate) => candidate.path.replaceAll(/^\/+|\/+$/g, "") === path);
	if (page !== undefined) {
		throw new TypeError(
			`Page "${page.path}" collides with the panel's MCP server (path "${path}").`,
		);
	}
}

/** Browsers omit a scheme's default port from Origin, so a listed one must match without it. */
const normalize = (origin: string) =>
	origin
		.toLowerCase()
		.replace(/\/+$/, "")
		.replace(/^(http:\/\/[^/]+):80$/, "$1")
		.replace(/^(https:\/\/[^/]+):443$/, "$1");

/**
 * ValidateMcpOrigin: streamable HTTP must check Origin (DNS rebinding). The
 * request's own Host is never trusted for it: a rebound request carries the attacker's.
 */
export function originDenied(config: McpConfig, request: Request): Response | null {
	const origin = request.headers.get("origin");
	if (origin === null || origin === "") {
		return null;
	}
	const allowed = (config.allowedOrigins ?? []).map(normalize);
	if (allowed.includes(normalize(origin))) {
		return null;
	}
	const message = `Origin "${origin}" is not allowed for this MCP server.`;
	return rpcError({ id: null, code: -32600, message }, 403);
}

export const unauthenticated = () =>
	rpcError({ id: null, code: -32001, message: "Unauthenticated." }, 401);

/** One MCP request, already authenticated and running in the user's context. */
export function serveMcp(
	request: Request,
	env: Omit<ToolEnv, "pages" | "report"> & {
		config: McpConfig;
		prefix: string;
		pages: PageDef[];
	},
): Promise<Response> {
	const { origin } = new URL(request.url);
	const tools = mcpTools({
		pages: new McpPages(env.pages, env.prefix, origin),
		options: env.options,
		report: env.config.report ?? ((error) => console.error("MCP tool failed:", error)),
		fetchRemote: env.config.fetchRemote,
	});
	return serveRpc(request, {
		name: "Tabletop Admin",
		version: "1.0.0",
		instructions: INSTRUCTIONS,
		tools,
	});
}

/** The MCP route's own stack: Origin, then the host's auth, then the tools as that user. */
export async function mcpRoute(
	request: Request,
	config: McpConfig,
	run: (user: unknown) => Promise<Response>,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(null, { status: 405, headers: { allow: "POST" } });
	}
	const denied = originDenied(config, request);
	if (denied !== null) {
		return denied;
	}
	const user = await config.authenticate(request);
	return user == null ? unauthenticated() : run(user);
}
