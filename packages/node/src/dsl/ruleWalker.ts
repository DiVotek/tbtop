import { currentContext, defaultLocale } from "./context";
import { Select } from "./fields/choices";
import { Field } from "./fields/field";
import { Upload } from "./fields/files";
import { isConditionMet } from "./inclusion";
import { Node } from "./node";
import { descendants } from "./walk";

export type Rules = Record<string, string[]>;

/** Whole-field rules: on `field.*` the implicit family never runs for `[]`. */
const FIELD_LEVEL = [
	"nullable",
	"array",
	"min",
	"max",
	"size",
	"between",
	"distinct",
	"present",
	"filled",
];
const FIELD_LEVEL_PREFIXES = ["required", "missing", "prohibited"];

/**
 * Validation rules a form's fields declare (RuleWalker.php): repeater rows as
 * `parent.*.child`, translatable fields as `field.locale`.
 */
export function collectRules(children: unknown[], prefix = ""): Rules {
	const rules: Rules = {};
	for (const [key, field] of Object.entries(fieldsByKey(children, prefix))) {
		Object.assign(rules, fromField(field, key.slice(0, key.length - field.name.length)));
	}
	return rules;
}

/** `key → label` for every labelled field, keyed as collectRules() keys it. */
export function collectAttributes(children: unknown[]): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const [key, field] of Object.entries(fieldsByKey(children))) {
		const label = field.labelText();
		if (label === null) {
			continue;
		}
		attributes[key] = label;
		const locales = field.isTranslatableField() ? currentContext().contentLocales : [];
		for (const locale of locales) {
			attributes[`${key}.${locale}`] = `${label} (${locale})`;
		}
	}
	return attributes;
}

/** Every field the walk reads, keyed by its own rule key. */
export function fieldsByKey(children: unknown[], prefix = ""): Record<string, Field> {
	const out: Record<string, Field> = {};
	for (const field of submittedFields(children)) {
		const key = `${prefix}${field.name}`;
		out[key] = field;
		if (!field.isTranslatableField()) {
			Object.assign(out, fieldsByKey(field.childFields(), `${key}.*.`));
		}
	}
	return out;
}

/** The fields a form submits, in order: layout walked through, containers as one entry. */
export function submittedFields(children: unknown[]): Field[] {
	const fields: Field[] = [];
	for (const child of children) {
		if (!isConditionMet(child)) {
			continue;
		}
		if (child instanceof Field) {
			fields.push(child);
		} else if (child instanceof Node) {
			fields.push(...submittedFields(descendants(child)));
		}
	}
	return fields;
}

function fromField(field: Field, prefix: string): Rules {
	const key = `${prefix}${field.name}`;
	if (field.isTranslatableField()) {
		return translatableRules(field, key);
	}
	if (field instanceof Select && field.isMultiple()) {
		return splitRules(key, field.ruleEntries(), []);
	}
	if (field instanceof Upload) {
		return uploadRules(field, key, field.ruleEntries());
	}
	const entries = field.ruleEntries();
	// Rule-less fields get a permissive baseline so they stay in the validated payload.
	return { [key]: entries.length === 0 ? ["nullable"] : entries };
}

function translatableRules(field: Field, key: string): Rules {
	const { contentLocales } = currentContext();
	const fallback = defaultLocale();
	const overrides = field.localeRuleEntries();
	const rules: Rules = { [key]: ["nullable", "array"] };
	for (const locale of contentLocales) {
		const own = locale === fallback ? field.ruleEntries() : [];
		const entries = overrides[locale] ?? (own.length > 0 ? own : ["nullable"]);
		Object.assign(
			rules,
			field instanceof Upload
				? uploadRules(field, `${key}.${locale}`, entries)
				: { [`${key}.${locale}`]: entries },
		);
	}
	return rules;
}

/** Upload values are stored path strings; a multiple upload validates each under `key.*`. */
function uploadRules(field: Upload, key: string, entries: string[]): Rules {
	if (!field.isMultiple()) {
		if (entries.length === 0) {
			return { [key]: ["nullable", "string"] };
		}
		return { [key]: entries.includes("string") ? entries : [...entries, "string"] };
	}
	const maxFiles = field.optionValue("maxFiles");
	const hasMax = entries.some((entry) => ruleName(entry) === "max");
	const implied = !hasMax && typeof maxFiles === "number" ? [`max:${maxFiles}`] : [];
	const rules = splitRules(key, [...entries, ...implied], ["string"]);
	return { [key]: rules[key] ?? [], [`${key}.*`]: rules[`${key}.*`] ?? ["string"] };
}

/** Field-level rules on `key` (after `array`), the rest on each element under `key.*`. */
function splitRules(key: string, entries: string[], element: string[]): Rules {
	const fieldRules = ["array"];
	const elementRules = [...element];
	for (const entry of entries) {
		if (!isFieldLevel(ruleName(entry))) {
			elementRules.push(entry);
		} else if (entry !== "array") {
			fieldRules.push(entry);
		}
	}
	return elementRules.length > 0
		? { [key]: fieldRules, [`${key}.*`]: elementRules }
		: { [key]: fieldRules };
}

function ruleName(entry: string): string {
	return entry.split(":", 1)[0] ?? entry;
}

function isFieldLevel(name: string): boolean {
	return FIELD_LEVEL.includes(name) || FIELD_LEVEL_PREFIXES.some((p) => name.startsWith(p));
}
