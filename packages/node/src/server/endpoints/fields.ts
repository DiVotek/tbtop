import { collectAttributes, collectRules, type Relation } from "../../dsl";
import { keyOf, type QueryDriver } from "../driver";
import { notFound } from "../http";
import { pickTranslation } from "../translatable";
import { readInput } from "./input";
import { readDeps, respondOptions } from "./options";
import { arg, type Endpoint, requireDriver } from "./types";
import { validated } from "./validateWith";

/** POST select-options/{field}: a query()-backed select's search and label lookup. */
const selectOptions: Endpoint = {
	method: "POST",
	pattern: ["select-options", ":field"],
	async run(ctx) {
		const field = ctx.resolved.s.findQueryableSelect(arg(ctx, 0));
		if (field === null) {
			throw notFound(
				`Select field "${arg(ctx, 0)}" with query() is not defined on this page.`,
			);
		}
		return respondOptions(field, await readInput(ctx));
	},
};

/** POST select-create/{field}: validate the creatable mini-form, answer `{value, label}`. */
const selectCreate: Endpoint = {
	method: "POST",
	pattern: ["select-create", ":field"],
	async run(ctx) {
		const field = ctx.resolved.s.findCreatableSelect(arg(ctx, 0));
		const create = field?.creatableClosure();
		if (field === null || create === undefined) {
			throw notFound(
				`Select field "${arg(ctx, 0)}" with creatable() is not defined on this page.`,
			);
		}
		const fields = field.creatableFields();
		const options = { attributes: collectAttributes(fields), hostRules: ctx.options.hostRules };
		return create(await validated(await readInput(ctx), collectRules(fields), options));
	},
};

/** POST relation-search/{field}: `{search}` → options, `{value}` → option, over the driver. */
const relationSearch: Endpoint = {
	method: "POST",
	pattern: ["relation-search", ":field"],
	async run(ctx) {
		const field = ctx.resolved.s.findRelationField(arg(ctx, 0));
		const query = field?.queryClosure();
		if (field === null || query === undefined) {
			throw notFound(
				`Relation field "${arg(ctx, 0)}" with query() is not defined on this page.`,
			);
		}
		return relationOptions(field, await readInput(ctx), requireDriver(ctx.options));
	},
};

/** POST relation-create/{field}: validate the mini-form, save through creatable(), answer `{value, label}`. */
const relationCreate: Endpoint = {
	method: "POST",
	pattern: ["relation-create", ":field"],
	async run(ctx) {
		const field = ctx.resolved.s.findRelationField(arg(ctx, 0));
		const create = field?.creatableClosure();
		if (field === null || create === undefined) {
			throw notFound(
				`Relation field "${arg(ctx, 0)}" with creatable() is not defined on this page.`,
			);
		}
		const body = await readInput(ctx);
		const fields = field.creatableFields();
		const options = { attributes: collectAttributes(fields), hostRules: ctx.options.hostRules };
		const values = await validated(body, collectRules(fields), options);
		const key = keyOf(requireDriver(ctx.options));
		const row = await create(values, readDeps(body, field.dependsOnFields()));
		if (
			row === null ||
			typeof row !== "object" ||
			row[key] === undefined ||
			row[key] === null
		) {
			throw new Error(
				`Relation field "${field.name}": creatable() must return the created row with its "${key}".`,
			);
		}
		return relationOption(row, key, field.getLabelKey());
	},
};

/** One row as the picker's `{value, label}` (RelationSearchResponder::toOption). */
function relationOption(
	row: Record<string, unknown>,
	key: string,
	labelKey: string,
): { value: string; label: string } {
	return { value: String(row[key]), label: String(pickTranslation(row[labelKey]) ?? "") };
}

/** RelationSearchResponder: `{search}` → options, `{value}` → option, over the driver. */
export async function relationOptions(
	field: Relation,
	body: Record<string, unknown>,
	driver: QueryDriver,
): Promise<unknown> {
	const query = field.queryClosure();
	if (query === undefined) {
		return { options: [] };
	}
	const base = query(readDeps(body, field.dependsOnFields()));
	const labelKey = field.getLabelKey();
	const option = (row: Record<string, unknown>) => relationOption(row, keyOf(driver), labelKey);
	if ("value" in body) {
		const scoped = driver.where(base, {
			field: keyOf(driver),
			op: "=",
			value: String(body.value),
		});
		const [row] = await driver.rows(scoped, { page: 1, perPage: 1 });
		return { option: row === undefined ? null : option(row) };
	}
	const search = typeof body.search === "string" ? body.search : "";
	const searched =
		search === ""
			? base
			: driver.where(base, { field: labelKey, op: "contains", value: search });
	const rows = await driver.rows(searched, { page: 1, perPage: field.getSearchLimit() });
	return { options: rows.map(option) };
}

/** POST daterange-ranges/{field}: disabledRanges() re-run with the parent values. */
const daterangeRanges: Endpoint = {
	method: "POST",
	pattern: ["daterange-ranges", ":field"],
	async run(ctx) {
		const field = ctx.resolved.s.findDaterangeField(arg(ctx, 0));
		if (field === null) {
			throw notFound(
				`Daterange field "${arg(ctx, 0)}" with disabledRanges() is not defined on this page.`,
			);
		}
		return {
			ranges: field.rangesWith(readDeps(await readInput(ctx), field.dependsOnFields())),
		};
	},
};

/** POST live-region/{name}: the region's render() with the client's current values. */
const liveRegion: Endpoint = {
	method: "POST",
	pattern: ["live-region", ":name"],
	async run(ctx) {
		const region = ctx.resolved.s.findLiveRegion(arg(ctx, 0));
		if (region === null) {
			throw notFound(`Live region "${arg(ctx, 0)}" is not defined on this page.`);
		}
		return {
			nodes: await region.renderWith(
				readDeps(await readInput(ctx), region.dependsOnFields()),
			),
		};
	},
};

export const FIELD_ENDPOINTS = [
	selectOptions,
	selectCreate,
	relationSearch,
	relationCreate,
	daterangeRanges,
	liveRegion,
];
