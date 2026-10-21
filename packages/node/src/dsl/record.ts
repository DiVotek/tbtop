import { currentContext, defaultLocale } from "./context";
import { Field } from "./fields/field";
import { Repeater } from "./fields/nested";
import { DateField } from "./fields/temporal";
import { isConditionMet } from "./inclusion";
import { Node } from "./node";
import { formatPhpDate } from "./phpDate";
import { descendants } from "./walk";

type Record_ = Record<string, unknown>;

/**
 * A form's record as it ships in page props: field defaults seeded into
 * absent keys, date instants cut to their day, translatable scalars expanded
 * to locale maps (RecordDefaults, DateRecord, TranslatableRecord).
 */
export function recordData(record: Record_, children: unknown[]): Record_ {
	return normalizeTranslatable(
		normalizeDates(seedDefaults(record, children), children),
		children,
	);
}

/** Absent keys only: record({x: null}) keeps the null. */
export function seedDefaults(record: Record_, children: unknown[]): Record_ {
	const out = { ...record };
	for (const field of topLevelFields(children)) {
		if (Object.hasOwn(out, field.name)) {
			continue;
		}
		const seed = field instanceof Repeater ? repeaterRows(field) : field.defaultValue();
		if (seed !== null && seed !== undefined) {
			out[field.name] = seed;
		}
	}
	return out;
}

/** Layout containers are transparent; repeater rows are their own level. */
function topLevelFields(children: unknown[]): Field[] {
	const out: Field[] = [];
	for (const child of children) {
		if (!isConditionMet(child)) {
			continue;
		}
		if (child instanceof Field) {
			out.push(child);
		}
		if (!(child instanceof Repeater)) {
			out.push(...topLevelFields(descendants(child)));
		}
	}
	return out;
}

function repeaterRows(field: Repeater): unknown[] | null {
	const fallback = field.defaultValue();
	const rows = Array.isArray(fallback) ? [...fallback] : [];
	const wanted = field.defaultItemCount();
	if (rows.length === 0 && wanted === 0) {
		return null;
	}
	while (rows.length < wanted) {
		rows.push({});
	}
	return rows;
}

const INSTANT = /^\d{4}-\d{2}-\d{2}[T ]/;

/** A date field's value is a Y-m-d day, read in the app timezone. */
function normalizeDates(record: Record_, children: unknown[]): Record_ {
	const out = { ...record };
	for (const name of namesOf(children, (c) => c instanceof DateField)) {
		const value = out[name];
		if (value instanceof Date || (typeof value === "string" && INSTANT.test(value))) {
			out[name] = formatPhpDate(value, "Y-m-d");
		}
	}
	return out;
}

/** Translatable record values are locale maps; a legacy scalar lands in the default locale. */
function normalizeTranslatable(record: Record_, children: unknown[]): Record_ {
	const out = { ...record };
	const isTranslatable = (c: unknown) => c instanceof Field && c.isTranslatableField();
	for (const name of namesOf(children, isTranslatable)) {
		const value = out[name];
		if (Object.hasOwn(out, name) && value !== null && typeof value !== "object") {
			out[name] = toLocaleMap(value);
		}
	}
	return out;
}

/** Node containers only: a repeater's sub-fields never live at the top level. */
function namesOf(children: unknown[], matches: (child: unknown) => boolean): string[] {
	const names: string[] = [];
	for (const child of children) {
		if (!isConditionMet(child)) {
			continue;
		}
		if (matches(child)) {
			names.push((child as Field).name);
		} else if (child instanceof Node) {
			names.push(...namesOf(descendants(child), matches));
		}
	}
	return names;
}

function toLocaleMap(value: unknown): Record_ {
	const context = currentContext();
	const map: Record_ = Object.fromEntries(context.contentLocales.map((l) => [l, null]));
	map[defaultLocale(context)] = value;
	return map;
}
