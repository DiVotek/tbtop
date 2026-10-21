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

/** A JSON-RPC error answer; `status` is the HTTP status (403/401 before the server runs). */
export const rpcError = (error: { id: Id; code: number; message: string }, status = 200) =>
	rpc(
		{ jsonrpc: "2.0", id: error.id, error: { code: error.code, message: error.message } },
		status,
	);

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Streamable HTTP, stateless (what laravel/mcp's web transport answers): each
 * POST carries one JSON-RPC message and gets one JSON response; notifications
 * get 202. No SSE stream: the route answers only POST.
 */
export async function serveRpc(request: Request, server: McpServerInfo): Promise<Response> {
	const message: unknown = await request.json().catch(() => UNPARSABLE);
	if (!isObject(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
		const code = message === UNPARSABLE ? -32700 : -32600;
		return rpcError({ id: null, code, message: "Invalid JSON-RPC request." });
	}
	if (!("id" in message)) {
		return new Response(null, { status: 202 });
	}
	return dispatch(message as Message & { method: string }, server);
}

async function dispatch(message: Message & { method: string }, server: McpServerInfo) {
	const id = message.id ?? null;
	const params = isObject(message.params) ? message.params : {};
	const result = (value: unknown) => rpc({ jsonrpc: "2.0", id, result: value });
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
				return rpcError({
					id,
					code: -32602,
					message: `Unknown tool "${String(params.name)}".`,
				});
			}
			return result(await tool.call(isObject(params.arguments) ? params.arguments : {}));
		}
		default:
			return rpcError({ id, code: -32601, message: `Method "${message.method}" not found.` });
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
