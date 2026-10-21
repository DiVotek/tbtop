import type { QueryDriver } from "../driver";
import type { Resolved } from "../resolve";
import type { HostRule } from "../validation/validator";

export interface ServerOptions {
	/** The host's query driver: tables, relation search, reorder. */
	driver?: QueryDriver;
	/** Rules only the host can check, e.g. `unique`/`exists` against its database. */
	hostRules?: Record<string, HostRule>;
}

export interface EndpointCtx {
	resolved: Resolved;
	request: Request;
	/** The `:name` segments of the matched pattern, in order. */
	args: string[];
	options: ServerOptions;
}

export interface Endpoint {
	method: "GET" | "POST";
	/** Segments after the page path; `:x` matches any one segment. */
	pattern: string[];
	run(ctx: EndpointCtx): Promise<unknown>;
}

export function requireDriver(options: ServerOptions): QueryDriver {
	if (options.driver === undefined) {
		throw new Error("This endpoint needs a QueryDriver: pass `driver` to createAdmin().");
	}
	return options.driver;
}

export function arg(ctx: EndpointCtx, index: number): string {
	return ctx.args[index] ?? "";
}
