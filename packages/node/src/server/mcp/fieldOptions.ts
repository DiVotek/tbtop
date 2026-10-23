import { type Field, Relation, Select, type TableBuilder } from "../../dsl";
import type { ServerOptions } from "../endpoints";
import { relationOptions } from "../endpoints/fields";
import { respondOptions } from "../endpoints/options";
import { requireDriver } from "../endpoints/types";
import type { Resolved } from "../resolve";
import { AgentError } from "./answer";
import { formShape } from "./formArgs";
import { executable } from "./surface";

export interface Lookup {
	search: string;
	deps: Record<string, unknown>;
	options: ServerOptions;
}

/**
 * query()'s options lookup for a form field, found inside the named
 * executable's form (not by name across the page), so mcp(false) holds.
 */
export async function fieldOptions(
	resolved: Resolved,
	at: { executable: string; field: string },
	lookup: Lookup,
) {
	const [page, name = ""] = at.executable.split(/:(.*)/s);
	if (page !== resolved.page.path) {
		throw new AgentError(
			`Executable "${at.executable}" is not on page "${resolved.page.path}".`,
		);
	}
	const { form } = await executable(resolved, name);
	const field = form === null ? undefined : formShape(form).fields[at.field];
	if (field === undefined) {
		throw new AgentError(`Field "${at.field}" is not in the form of "${at.executable}".`);
	}
	return serve(field, `Field "${at.field}"`, lookup);
}

export function filterOptions(table: TableBuilder, name: string, lookup: Lookup) {
	const field = table.filterFields().find((candidate) => candidate.name === name);
	if (field === undefined) {
		throw new AgentError(`Unknown filter "${name}" for table "${table.name}".`);
	}
	return serve(field, `Filter "${name}"`, lookup);
}

async function serve(field: Field, what: string, lookup: Lookup) {
	if (!(field instanceof Select || field instanceof Relation) || !field.queryClosure()) {
		throw new AgentError(`${what} has no dynamic options; search() lists its options.`);
	}
	// The browser waits until every parent has a value; a closure reading one would fail.
	for (const parent of field.dependsOnFields()) {
		const value = lookup.deps[parent];
		if (!["string", "number", "boolean"].includes(typeof value) || String(value) === "") {
			throw new AgentError(`${what} needs deps.${parent} (dependsOn).`);
		}
	}
	const body = { search: lookup.search, deps: lookup.deps };
	const answer = (
		field instanceof Select
			? await respondOptions(field, body)
			: await relationOptions(field, body, requireDriver(lookup.options))
	) as { options?: { value?: unknown; label?: unknown }[] };
	return {
		options: (answer.options ?? []).map((o) => ({
			value: o.value ?? null,
			label: o.label ?? null,
		})),
	};
}
