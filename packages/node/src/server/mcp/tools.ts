import type { ServerOptions } from "../endpoints";
import { requireDriver } from "../endpoints/types";
import type { PageDef } from "../page";
import { runTable } from "../tableQuery";
import { AgentError, answer } from "./answer";
import { Execution } from "./execution";
import { assertSendable } from "./formInput";
import { assertNeedsSent, selectionKeys } from "./needs";
import { type McpPages, pathParams, routeParams } from "./pages";
import { optionsLookup } from "./queryOptions";
import { type FetchRemote, fetchInto } from "./remoteFiles";
import type { McpTool } from "./rpc";
import { SCHEMAS } from "./schemas";
import { briefSurface, describeSurface, executable } from "./surface";
import { checkTableArgs } from "./tableArgs";

export interface ToolEnv {
	pages: McpPages;
	options: ServerOptions;
	report: (error: unknown) => void;
	/** McpConfig.fetchRemote: with it, upload fields take `{url}`. */
	fetchRemote?: FetchRemote;
}

type Args = Record<string, unknown>;

const bag = (value: unknown): Args =>
	value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Args) : {};

/** Resolves `page` with its params behind its gate: the first step of every tool. */
async function open(env: ToolEnv, args: Args) {
	const page = env.pages.find(String(args.page ?? ""));
	const params = routeParams(page, bag(args.params));
	return { page, params, resolved: await env.pages.resolve(page, params) };
}

async function search(env: ToolEnv, args: Args): Promise<Record<string, unknown>> {
	if (typeof args.page === "string" && args.page !== "") {
		const { page, resolved } = await open(env, args);
		const title = typeof page.title === "function" ? page.title(resolved.ctx) : page.title;
		return {
			page: page.path,
			title,
			...(await describeSurface(resolved, {
				withValues: args.values === true,
				files: env.fetchRemote !== undefined,
			})),
		};
	}
	const pages = await Promise.all(env.pages.all().map((page) => listed(env, page)));
	return { pages: pages.filter((entry) => entry !== null) };
}

/**
 * A page in the bare listing, as an index (briefSurface). One with route params is listed with them: its
 * gate runs when the agent opens it with real params. One whose gate or view()
 * fails is listed with an error, never failing the whole search.
 */
async function listed(env: ToolEnv, page: PageDef): Promise<Record<string, unknown> | null> {
	const params = pathParams(page);
	if (params.length > 0) {
		const title = typeof page.title === "string" ? page.title : page.path;
		return { page: page.path, title, params };
	}
	try {
		const request = new Request(env.pages.url(page, {}));
		if (!((await page.authorize?.({ params: {}, request })) ?? true)) {
			return null;
		}
		const { resolved } = await open(env, { page: page.path });
		const title = typeof page.title === "function" ? page.title(resolved.ctx) : page.title;
		return {
			page: page.path,
			title,
			...(await briefSurface(resolved, env.fetchRemote !== undefined)),
		};
	} catch (error) {
		env.report(error);
		return { page: page.path, error: "This page failed to build; see the application log." };
	}
}

/** Tool argument → the table endpoint's query key. */
const QUERY_KEYS: Record<string, string> = {
	pageNumber: "page",
	perPage: "perPage",
	search: "search",
	columnSearch: "colSearch",
	filters: "filters",
	tab: "tab",
	sort: "sort",
	dir: "dir",
};

async function query(env: ToolEnv, args: Args) {
	const { resolved } = await open(env, args);
	const options = await optionsLookup(resolved, args, {
		options: env.options,
		files: env.fetchRemote !== undefined,
	});
	if (options !== null) {
		return options;
	}
	const name = String(args.table ?? "");
	const table = resolved.s.reachableTable(name);
	if (table?.queryClosure() === undefined) {
		throw new AgentError(`Table "${name}" has no query on this page.`);
	}
	const checked = await checkTableArgs(table, args);
	const params = Object.fromEntries(
		Object.entries(QUERY_KEYS).flatMap(([arg, key]) =>
			checked[arg] == null ? [] : [[key, checked[arg]]],
		),
	);
	return runTable(table, params, requireDriver(env.options));
}

async function execute(env: ToolEnv, args: Args) {
	const [slug = "", name = ""] = String(args.id ?? "").split(/:(.*)/s);
	const target = await open(env, { page: slug, params: args.params });
	const { fetchRemote } = env;
	const { action, form } = await executable(target.resolved, name, fetchRemote !== undefined);
	if (action !== null) {
		const needs = (action.getSpec()?.needs as string[] | undefined) ?? [];
		assertNeedsSent(`${slug}:${name}`, needs, args);
	}
	const execution = new Execution({ ...target, pages: env.pages, options: env.options });
	let input = bag(args.form);
	if (form !== null) {
		assertSendable(form, input, fetchRemote !== undefined);
		if (fetchRemote !== undefined) {
			const remote = { fetchRemote, options: env.options, session: execution.session };
			input = await fetchInto(form, input, remote);
		}
	}
	if (action === null) {
		return execution.form(name, input);
	}
	const payload = { form: input, row: bag(args.row), selection: selectionKeys(args.selection) };
	return execution.action(
		name,
		Object.fromEntries(Object.entries(payload).filter(([, v]) => Object.keys(v).length > 0)),
	);
}

/** search / query / execute (TbtopMcpServer's tools), each answering through answer(). */
export function mcpTools(env: ToolEnv): McpTool[] {
	const tool = (
		name: keyof typeof SCHEMAS,
		run: (env: ToolEnv, args: Args) => Promise<unknown>,
	) => ({
		name,
		...SCHEMAS[name],
		call: (args: Args) => answer(() => run(env, args), env.report),
	});
	return [tool("search", search), tool("query", query), tool("execute", execute)];
}
