import { materialize, type TableBuilder, type WireNode } from "../../dsl";
import { filterValueShape } from "../tableFilters";
import { AgentError } from "./answer";
import { optionsOf } from "./formFields";

type Args = Record<string, unknown>;

const isSent = (value: unknown) =>
	value !== undefined &&
	value !== null &&
	value !== "" &&
	!(typeof value === "object" && Object.keys(value).length === 0);
const isText = (value: unknown) => typeof value === "string" || typeof value === "number";
const show = (value: unknown) =>
	typeof value === "object" ? JSON.stringify(value) : String(value);

/** search()'s description of a table; `sortable` includes the default-sort field. */
export async function describeTable(table: TableBuilder): Promise<Record<string, unknown>> {
	const sortable = table.sortableColumnNames();
	const fallback = table.defaultSortSpec()?.field;
	if (fallback !== undefined && !sortable.includes(fallback)) {
		sortable.push(fallback);
	}
	const filters = await Promise.all(
		table.filterFields().map(async (field) => {
			const { kind, options } = await materialize<WireNode>(field.toNode());
			return compact({
				name: field.name,
				kind,
				label: field.labelText(),
				value: filterValueShape(field),
				options: optionsOf(field, options),
			});
		}),
	);
	return compact({
		table: table.name,
		columns: table.visibleColumns().map((c) => compact({ name: c.name, label: c.st.label })),
		search: table.searchableFields(),
		columnSearch: table.individuallySearchableColumns(),
		filters,
		tabs: table.tabObjects().map((tab) => tab.name),
		sortable,
		pagination: table.paginationSpec(),
	});
}

function compact(entries: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(entries).filter(
			([, v]) =>
				v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
		),
	);
}

/**
 * TableArguments::check(): refuses a sort, dir, perPage, filter, columnSearch
 * or search the description does not list. A lone `dir` sorts by the default field.
 */
export async function checkTableArgs(table: TableBuilder, args: Args): Promise<Args> {
	const described = await describeTable(table);
	const checked = checkSort(table, (described.sortable as string[] | undefined) ?? [], args);
	checkPerPage(table.paginationSpec(), args.perPage);
	const filterNames = ((described.filters as { name: string }[] | undefined) ?? []).map(
		(f) => f.name,
	);
	checkNames(
		args.filters,
		filterNames,
		(key) => `Unknown filter "${key}" for table "${table.name}".`,
	);
	checkNames(
		args.columnSearch,
		(described.columnSearch as string[] | undefined) ?? [],
		(key) => `Column "${key}" is not searchable in table "${table.name}".`,
	);
	checkSearch(table.name, described.search !== undefined, args);
	return checked;
}

function checkSort(table: TableBuilder, sortable: string[], args: Args): Args {
	const { sort, dir } = args;
	if (isSent(sort) && !sortable.includes(String(sort))) {
		throw new AgentError(`Unknown sort "${show(sort)}" for table "${table.name}".`);
	}
	if (isSent(dir) && dir !== "asc" && dir !== "desc") {
		throw new AgentError('dir must be "asc" or "desc".');
	}
	if (isSent(sort) || !isSent(dir)) {
		return args;
	}
	const fallback = table.defaultSortSpec()?.field;
	if (fallback === undefined) {
		throw new AgentError(`dir needs sort for table "${table.name}".`);
	}
	return { ...args, sort: fallback };
}

function checkPerPage(pagination: { perPage: number; options: number[] }, perPage: unknown): void {
	const allowed = [...new Set([...pagination.options, pagination.perPage])].sort((a, b) => a - b);
	if (!isSent(perPage) || allowed.includes(Number(perPage))) {
		return;
	}
	throw new AgentError(`perPage ${show(perPage)} is not one of ${allowed.join(", ")}.`);
}

function checkNames(sent: unknown, allowed: string[], message: (key: string) => string): void {
	if (sent === null || typeof sent !== "object") {
		return;
	}
	const unknown = Object.keys(sent).find((key) => !allowed.includes(key));
	if (unknown !== undefined) {
		throw new AgentError(message(unknown));
	}
}

function checkSearch(name: string, hasSearch: boolean, args: Args): void {
	if (isSent(args.search) && !hasSearch) {
		throw new AgentError(`Table "${name}" has no search.`);
	}
	if (isSent(args.search) && !isText(args.search)) {
		throw new AgentError(`search must be text for table "${name}".`);
	}
	const columnSearch = args.columnSearch;
	const entries = columnSearch !== null && typeof columnSearch === "object" ? columnSearch : {};
	for (const [column, text] of Object.entries(entries)) {
		if (text !== null && !isText(text)) {
			throw new AgentError(`columnSearch "${column}" must be text for table "${name}".`);
		}
	}
}
