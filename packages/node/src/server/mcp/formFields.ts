import {
	collectRules,
	type Field,
	materialize,
	Relation,
	Richtext,
	type Rules,
	Select,
	type WireNode,
} from "../../dsl";
import { fieldsByKey } from "../../dsl/ruleWalker";
import { RICHTEXT_NODE_TYPES } from "./richtext";

/** Kinds whose value is a server-side upload an agent cannot produce. */
export const UNSUPPORTED_KINDS = ["upload", "media"];

type Described = Record<string, unknown>;
type Named = { name: string; kind: string };

export interface FieldList {
	fields: Described[];
	excluded: (Named & { reason: string })[];
	/** Excluded fields a submit cannot do without. */
	required: Named[];
}

const present = (entries: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(entries).filter(
			([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
		),
	);

/** Whether query()'s options lookup serves the field: search() marks exactly these `dynamic`. */
export function isServed(field: Field): boolean {
	return (
		(field instanceof Select || field instanceof Relation) && field.queryClosure() !== undefined
	);
}

/** The field's choices as {value, label}, `dynamic` when query() serves them, null when free-form. */
export function optionsOf(field: Field, options: Record<string, unknown>): unknown {
	if (Array.isArray(options.options)) {
		return (options.options as Record<string, unknown>[]).map((option) => ({
			value: option.value ?? null,
			label: String(option.label ?? ""),
		}));
	}
	return isServed(field) ? "dynamic" : null;
}

/**
 * FormFields::describe(): `fields` keyed as fieldsByKey() keys them. A
 * container's children follow it as `name.*.child`; an excluded field counts
 * as required only when its row must exist.
 */
export async function describeFields(fields: Record<string, Field>, rules: Rules) {
	const out: FieldList = { fields: [], excluded: [], required: [] };
	const rowMandatory = new Map<string, boolean>();
	for (const [name, field] of Object.entries(fields)) {
		const cut = name.lastIndexOf(".*.");
		const mandatory = cut === -1 || rowMandatory.get(name.slice(0, cut)) === true;
		const node = await materialize<WireNode>(field.toNode());
		if (UNSUPPORTED_KINDS.includes(node.kind)) {
			const reason = `${node.kind} fields cannot be filled over MCP`;
			out.excluded.push({ name, kind: node.kind, reason });
			const blocking = mandatory && isRequired(name, rules);
			out.required.push(...(blocking ? [{ name, kind: node.kind }] : []));
			continue;
		}
		const minItems = Number(node.options.minItems ?? 0);
		rowMandatory.set(
			name,
			mandatory && ((rules[name] ?? []).includes("required") || minItems > 0),
		);
		const container = Object.keys(fields).some((key) => key.startsWith(`${name}.*.`));
		out.fields.push(await describeField(field, { name, node, rules, nested: !container }));
	}
	return out;
}

/** `required` without `sometimes` on the same key (`name`, `name.*`, `name.en`); rule objects do not count. */
function isRequired(name: string, rules: Rules): boolean {
	return Object.entries(rules).some(
		([key, list]) =>
			(key === name || key.startsWith(`${name}.`)) &&
			list.includes("required") &&
			!list.includes("sometimes"),
	);
}

async function describeField(
	field: Field,
	at: { name: string; node: WireNode; rules: Rules; nested: boolean },
): Promise<Described> {
	const { name, node, rules } = at;
	const { options } = node;
	const nested = at.nested
		? Object.fromEntries(Object.entries(rules).filter(([key]) => key.startsWith(`${name}.`)))
		: {};
	return {
		...present({
			name,
			kind: node.kind,
			label: field.labelText(),
			help:
				typeof options.helperText === "string" && options.helperText !== ""
					? options.helperText
					: undefined,
			rules: rules[name] ?? [],
			nestedRules: Object.keys(nested).length > 0 ? nested : undefined,
			mask: typeof options.mask === "string" ? options.mask : undefined,
			dependsOn: Array.isArray(options.dependsOn) ? options.dependsOn : undefined,
			options: optionsOf(field, options),
		}),
		...(field.isTranslatableField() ? { translatable: true } : {}),
		...(field instanceof Richtext ? await richtext(field) : {}),
	};
}

/** The node types a document may hold, and each embed kind with the fields of its `data`. */
async function richtext(field: Richtext): Promise<Described> {
	const embeds = await Promise.all(
		field.getEmbeds().map(async (embed) => {
			const children = embed.includedFields();
			const described = await describeFields(fieldsByKey(children), collectRules(children));
			return present({
				kind: embed.kind,
				label: embed.labelText(),
				fields: described.fields,
				excludedFields: described.excluded,
			});
		}),
	);
	return { nodes: RICHTEXT_NODE_TYPES, ...(embeds.length > 0 ? { embeds } : {}) };
}
