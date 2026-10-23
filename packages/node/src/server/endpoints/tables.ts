import { Effects, type Row, type TableBuilder } from "../../dsl";
import { keyOf } from "../driver";
import { effectsBody, notFound, phpQuery, unprocessable } from "../http";
import { runTable } from "../tableQuery";
import { readInput, trimInput } from "./input";
import { respondOptions } from "./options";
import { arg, type Endpoint, type EndpointCtx, requireDriver } from "./types";
import { validated } from "./validateWith";

function table(ctx: EndpointCtx): TableBuilder {
	const found = ctx.resolved.s.reachableTable(arg(ctx, 0));
	if (found === null) {
		throw notFound(`Table "${arg(ctx, 0)}" not found on this page.`);
	}
	return found;
}

function scope(found: TableBuilder, what: string): unknown {
	const query = found.queryClosure();
	if (query === undefined) {
		throw unprocessable(`${what} requires a query closure on the table.`);
	}
	return query();
}

/** GET tables/{name}: one page of projected rows, plus tab counts. */
const tableData: Endpoint = {
	method: "GET",
	pattern: ["tables", ":name"],
	async run(ctx) {
		const found = table(ctx);
		if (found.queryClosure() === undefined) {
			throw notFound(`Table "${found.name}" has no query on this page.`);
		}
		const params = trimInput(phpQuery(new URL(ctx.request.url).searchParams), ctx.options);
		return { data: await runTable(found, params, requireDriver(ctx.options)) };
	},
};

/** POST cells/{table}/{column}: validate one cell, find its row in scope, run onSave. */
const saveCell: Endpoint = {
	method: "POST",
	pattern: ["cells", ":table", ":column"],
	async run(ctx) {
		const found = table(ctx);
		const name = arg(ctx, 1);
		const column = found.visibleColumns().find((c) => c.name === name && c.isEditable());
		if (column?.st.onSave === undefined) {
			throw notFound(`Column "${name}" is not editable on table "${found.name}".`);
		}
		const payload = ((await readInput(ctx)).payload ?? {}) as Row;
		const rules = column.st.editRules.length > 0 ? { [name]: column.st.editRules } : {};
		const attributes = column.st.label === undefined ? {} : { [name]: column.st.label };
		const data = await validated({ [name]: payload.value ?? null }, rules, {
			attributes,
			hostRules: ctx.options.hostRules,
		});
		const record = await findRow(ctx, scope(found, "Editable columns"), payload.id);
		const result = await column.st.onSave(record, rules[name] ? data[name] : payload.value);
		return effectsBody(result, Effects.make().refreshTable(found.name));
	},
};

async function findRow(ctx: EndpointCtx, query: unknown, id: unknown): Promise<Row> {
	if (typeof id !== "string" && typeof id !== "number") {
		throw unprocessable("Missing record id.");
	}
	const driver = requireDriver(ctx.options);
	const [row] = await driver.rows(
		driver.where(query, { field: keyOf(driver), op: "=", value: id }),
		{ page: 1, perPage: 1 },
	);
	if (row === undefined) {
		throw notFound("Record not found.");
	}
	return row;
}

/** POST tables/{name}/reorder: each id's index to the reorder column, ids checked against the scope. */
const reorder: Endpoint = {
	method: "POST",
	pattern: ["tables", ":name", "reorder"],
	async run(ctx) {
		const found = table(ctx);
		const column = found.reorderColumn();
		if (column === null) {
			throw unprocessable(`Table "${found.name}" is not reorderable.`);
		}
		const body = await validated(
			await readInput(ctx),
			{ ids: ["required", "array", "min:1"], "ids.*": ["required", "distinct"] },
			{},
		);
		const ids = (body.ids as unknown[]).filter((id): id is string | number =>
			["string", "number"].includes(typeof id),
		);
		const driver = requireDriver(ctx.options);
		const query = scope(found, "Reordering");
		const inScope = await driver.count(
			driver.where(query, { field: keyOf(driver), op: "in", value: ids }),
		);
		if (inScope !== ids.length || new Set(ids.map(String)).size !== ids.length) {
			throw unprocessable("One or more ids are outside the table scope.");
		}
		for (const [index, id] of ids.entries()) {
			await driver.update(query, id, { [column]: index });
		}
		return { effects: Effects.make().refreshTable(found.name) };
	},
};

/** POST tables/{table}/filters/{field}/options: a query()-backed select filter. */
const filterOptions: Endpoint = {
	method: "POST",
	pattern: ["tables", ":table", "filters", ":field", "options"],
	async run(ctx) {
		const field =
			ctx.resolved.s.reachableTable(arg(ctx, 0))?.findQueryableSelectFilter(arg(ctx, 1)) ??
			null;
		if (field === null) {
			throw notFound(
				`Query-backed Select filter "${arg(ctx, 1)}" is not defined on table "${arg(ctx, 0)}".`,
			);
		}
		return respondOptions(field, await readInput(ctx));
	},
};

export const TABLE_ENDPOINTS = [tableData, saveCell, reorder, filterOptions];
