import type { QueryDriver } from "../driver";
import type { SessionStore } from "../inertia/session";
import type { Resolved } from "../resolve";
import type { UploadOptions } from "../uploads/config";
import type { HostRule } from "../validation/validator";

export interface ServerOptions extends UploadOptions {
	/** The host's query driver: tables, relation search, reorder. */
	driver?: QueryDriver;
	/** Rules only the host can check, e.g. `unique`/`exists` against its database. */
	hostRules?: Record<string, HostRule>;
	/**
	 * Laravel's TrimStrings, on by default: request strings are trimmed before
	 * validation, except password keys and richtext documents. `except` names
	 * more keys (a field name, or a dotted tail like `links.*.label`); `false` turns it off.
	 */
	trimStrings?: false | { except?: string[] };
}

export interface EndpointCtx {
	resolved: Resolved;
	request: Request;
	/** The `:name` segments of the matched pattern, in order. */
	args: string[];
	options: ServerOptions;
	session: SessionStore;
}

export interface Endpoint {
	method: "GET" | "POST";
	/** Segments after the page path; `:x` matches any one segment. */
	pattern: string[];
	/** A JSON body, or a finished Response (the Inertia form submit redirects). */
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
