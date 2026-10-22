import type { ToolResult } from "./answer";

/** One MCP tool: what tools/list shows, and its call. */
export interface McpTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations: Record<string, boolean>;
	call(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface McpServerInfo {
	name: string;
	version: string;
	instructions: string;
	tools: McpTool[];
}

type Id = string | number | null;
type Message = { jsonrpc?: unknown; id?: Id; method?: unknown; params?: unknown };

const UNPARSABLE = Symbol("unparsable");

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const rpc = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

const errorBody = ({ id, code, message }: { id: Id; code: number; message: string }) => ({
	jsonrpc: "2.0",
	id,
	error: { code, message },
});

/** A JSON-RPC error answer; `status` is the HTTP status (403/401 before the server runs). */
export const rpcError = (error: { id: Id; code: number; message: string }, status = 200) =>
	rpc(errorBody(error), status);

const accepted = () => new Response(null, { status: 202 });

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Streamable HTTP, stateless (what laravel/mcp's web transport answers): a
 * POST carries one JSON-RPC message, or a batch of them (2025-03-26), and
 * gets the answers as JSON; notifications and client responses alone get
 * 202. No SSE stream: the route answers only POST.
 */
export async function serveRpc(request: Request, server: McpServerInfo): Promise<Response> {
	const parsed: unknown = await request.json().catch(() => UNPARSABLE);
	if (parsed === UNPARSABLE) {
		return rpcError({ id: null, code: -32700, message: "Invalid JSON-RPC request." });
	}
	if (!Array.isArray(parsed)) {
		const answer = await handle(parsed, server);
		return answer === null ? accepted() : rpc(answer);
	}
	if (parsed.length === 0) {
		return rpcError({ id: null, code: -32600, message: "Invalid JSON-RPC request." });
	}
	const answers: unknown[] = [];
	for (const message of parsed) {
		answers.push(await handle(message, server));
	}
	const sent = answers.filter((answer) => answer !== null);
	return sent.length === 0 ? accepted() : rpc(sent);
}

/** One message's answer; null for a notification or a response the client sends back. */
async function handle(message: unknown, server: McpServerInfo): Promise<unknown> {
	if (!isObject(message) || message.jsonrpc !== "2.0") {
		return errorBody({ id: null, code: -32600, message: "Invalid JSON-RPC request." });
	}
	if (typeof message.method !== "string") {
		const isResponse = "id" in message && ("result" in message || "error" in message);
		return isResponse
			? null
			: errorBody({ id: null, code: -32600, message: "Invalid JSON-RPC request." });
	}
	if (!("id" in message)) {
		return null;
	}
	return dispatch(message as Message & { method: string }, server);
}

async function dispatch(message: Message & { method: string }, server: McpServerInfo) {
	const id = message.id ?? null;
	const params = isObject(message.params) ? message.params : {};
	const result = (value: unknown) => ({ jsonrpc: "2.0", id, result: value });
	switch (message.method) {
		case "initialize":
			return result(initialize(params, server));
		case "ping":
			return result({});
		case "tools/list":
			return result({ tools: server.tools.map(({ call: _, ...tool }) => tool) });
		case "tools/call": {
			const tool = server.tools.find((candidate) => candidate.name === params.name);
			if (tool === undefined) {
				return errorBody({
					id,
					code: -32602,
					message: `Unknown tool "${String(params.name)}".`,
				});
			}
			return result(await tool.call(isObject(params.arguments) ? params.arguments : {}));
		}
		default:
			return errorBody({
				id,
				code: -32601,
				message: `Method "${message.method}" not found.`,
			});
	}
}

function initialize(params: Record<string, unknown>, server: McpServerInfo) {
	const asked = params.protocolVersion;
	return {
		protocolVersion:
			typeof asked === "string" && VERSIONS.includes(asked) ? asked : VERSIONS[0],
		capabilities: { tools: { listChanged: false } },
		serverInfo: { name: server.name, version: server.version },
		instructions: server.instructions,
	};
}
