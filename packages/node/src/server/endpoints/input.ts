import { readBody } from "../http";
import { trimStrings } from "../validation/data";
import type { EndpointCtx, ServerOptions } from "./types";

/** The request input as Laravel's TrimStrings middleware leaves it (unless turned off). */
export function trimInput<T>(value: T, options: ServerOptions): T {
	const config = options.trimStrings ?? {};
	return config === false ? value : (trimStrings(value, config.except) as T);
}

/** The JSON body, trimmed: what every endpoint reads instead of the raw body. */
export async function readInput(ctx: EndpointCtx): Promise<Record<string, unknown>> {
	return trimInput(await readBody(ctx.request), ctx.options);
}
