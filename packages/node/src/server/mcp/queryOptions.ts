import type { ServerOptions } from "../endpoints";
import type { Resolved } from "../resolve";
import { AgentError } from "./answer";
import { fieldOptions, filterOptions } from "./fieldOptions";

type Args = Record<string, unknown>;

const ROW_ARGS = ["pageNumber", "perPage", "columnSearch", "filters", "tab", "sort", "dir"];

const given = (value: unknown) => value !== undefined && value !== null;

/** The argument pairs query() accepts: table, table + filter, or executable + field. */
function assertShape(args: Args): void {
	const { table, executable, field, filter } = args;
	if (given(table) && (given(executable) || given(field))) {
		throw new AgentError(
			"Pass either table (with filter for options) or executable with field, not both.",
		);
	}
	if (given(executable) !== given(field) || (given(filter) && !given(table))) {
		throw new AgentError("field and executable go together; filter needs table.");
	}
	if (!given(table) && !given(executable)) {
		throw new AgentError("Pass table, or executable with field.");
	}
}

/** query()'s options lookup, or null when the call reads rows. */
export async function optionsLookup(
	resolved: Resolved,
	args: Args,
	options: ServerOptions,
): Promise<unknown> {
	assertShape(args);
	if (!given(args.executable) && !given(args.filter)) {
		if (given(args.deps)) {
			throw new AgentError(
				"deps applies only to an options lookup (executable + field, or table + filter).",
			);
		}
		return null;
	}
	if (ROW_ARGS.some((arg) => given(args[arg]))) {
		throw new AgentError("Row arguments do not apply to an options lookup.");
	}
	const deps = args.deps !== null && typeof args.deps === "object" ? (args.deps as Args) : {};
	const lookup = { search: String(args.search ?? ""), deps, options };
	if (given(args.executable)) {
		const at = { executable: String(args.executable), field: String(args.field) };
		return fieldOptions(resolved, at, lookup);
	}
	const table = resolved.s.reachableTable(String(args.table));
	if (table === null) {
		throw new AgentError(`Table "${String(args.table)}" is not on this page.`);
	}
	return filterOptions(table, String(args.filter), lookup);
}
