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

/** Keys a remote reference may carry; any other key makes the value an ordinary one. */
const KEYS = ["url", "alt", "name"];

/** RemoteFiles::isRemote(): a `{url: "https://…"}` reference. */
export function isRemote(value: unknown): value is { url: string; name?: string } {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const ref = value as Record<string, unknown>;
	return typeof ref.url === "string" && Object.keys(ref).every((key) => KEYS.includes(key));
}

/** Kinds whose value is a stored file: sent as `{url}` when the host fetches them (mcp.fetchRemote). */
export const FILE_KINDS = ["upload", "media"];

/** Whether a field of `kind` is excluded: a file field, unless `files` (the host fetches URLs) and it is an upload. */
export const excludesKind = (kind: string, files: boolean) =>
	FILE_KINDS.includes(kind) && !(files && kind === "upload");

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
export async function describeFields(fields: Record<string, Field>, rules: Rules, files: boolean) {
	const out: FieldList = { fields: [], excluded: [], required: [] };
	const rowMandatory = new Map<string, boolean>();
	for (const [name, field] of Object.entries(fields)) {
		const cut = name.lastIndexOf(".*.");
		const mandatory = cut === -1 || rowMandatory.get(name.slice(0, cut)) === true;
		const node = await materialize<WireNode>(field.toNode());
		if (excludesKind(node.kind, files)) {
			exclude(out, { name, kind: node.kind }, mandatory && isRequired(name, rules));
			continue;
		}
		const minItems = Number(node.options.minItems ?? 0);
		rowMandatory.set(
			name,
			mandatory && ((rules[name] ?? []).includes("required") || minItems > 0),
		);
		const container = Object.keys(fields).some((key) => key.startsWith(`${name}.*.`));
		out.fields.push(
			await describeField(field, { name, node, rules, nested: !container, files }),
		);
	}
	return out;
}

/** Lists an excluded field, and among the required ones when its absence blocks validation. */
function exclude(out: FieldList, field: Named, blocking: boolean): void {
	const reason =
		field.kind === "upload"
			? "upload fields need the host's mcp.fetchRemote to be filled over MCP"
			: `${field.kind} fields cannot be filled over MCP`;
	out.excluded.push({ ...field, reason });
	out.required.push(...(blocking ? [field] : []));
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
	at: { name: string; node: WireNode; rules: Rules; nested: boolean; files: boolean },
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
			help: options.helperText || undefined,
			rules: rules[name] ?? [],
			nestedRules: Object.keys(nested).length > 0 ? nested : undefined,
			mask: typeof options.mask === "string" ? options.mask : undefined,
			dependsOn: Array.isArray(options.dependsOn) ? options.dependsOn : undefined,
			options: optionsOf(field, options),
			...file(node.kind, options),
		}),
		...(field.isTranslatableField() ? { translatable: true } : {}),
		...(field instanceof Richtext ? await richtext(field, at.files) : {}),
	};
}

/** What a file field takes (FormFields::file()): `{url}`, within `accept`; nothing for other kinds. */
function file(kind: string, options: Record<string, unknown>): Described {
	if (!FILE_KINDS.includes(kind)) {
		return {};
	}
	const { accept } = options;
	return {
		value: "{url}",
		accept:
			typeof accept === "string"
				? accept.split(",").flatMap((part) => (part.trim() === "" ? [] : [part.trim()]))
				: accept,
		multiple: options.multiple === true ? true : undefined,
	};
}

/** The node types a document may hold, and each embed kind with the fields of its `data`. */
async function richtext(field: Richtext, files: boolean): Promise<Described> {
	const embeds = await Promise.all(
		field.getEmbeds().map(async (embed) => {
			const children = embed.includedFields();
			const described = await describeFields(
				fieldsByKey(children),
				collectRules(children),
				files,
			);
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
