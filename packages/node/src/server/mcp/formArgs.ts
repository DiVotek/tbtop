import { collectRules, type Field, type FormBuilder, type Rules } from "../../dsl";
import { fieldsByKey } from "../../dsl/ruleWalker";
import { describeFields } from "./formFields";

const ALL_EXCLUDED =
	"every field of its form is a file field MCP cannot fill (see its excludedFields)";

/** How a surface is described: form `values` on request, upload fields when the host fetches URLs. */
export interface SurfaceOptions {
	withValues?: boolean;
	files?: boolean;
}

export interface FormDescription {
	form: string;
	fields: Record<string, unknown>[];
	excludedFields?: Record<string, string>[];
	/** The form's current data as the UI prefills it, passwords left out. */
	values?: Record<string, unknown>;
}

/** The form's fields and rules, as validation and the agent see them. */
export function formShape(form: FormBuilder): { fields: Record<string, Field>; rules: Rules } {
	const children = form.includedChildren();
	return { fields: fieldsByKey(children), rules: collectRules(children) };
}

async function analyse(form: FormBuilder, at: SurfaceOptions) {
	const { fields, rules } = formShape(form);
	const described = await describeFields(fields, rules, at.files === true);
	const values = at.withValues === true ? shownValues(form, described.fields) : {};
	const out: FormDescription = {
		form: form.name,
		fields: described.fields,
		...(described.excluded.length > 0 ? { excludedFields: described.excluded } : {}),
		...(Object.keys(values).length > 0 ? { values } : {}),
	};
	return { described: out, required: described.required };
}

/** The record's values for the listed fields, passwords left out. */
function shownValues(form: FormBuilder, fields: Record<string, unknown>[]) {
	const shown = new Set(fields.filter((f) => f.kind !== "password").map((f) => String(f.name)));
	return Object.fromEntries(Object.entries(form.recordData()).filter(([key]) => shown.has(key)));
}

/**
 * FormArguments::describe(): kind, label, options and Laravel rules per field.
 * `values` only with `withValues`: they are the bulk of a record form. `files`:
 * the host fetches `{url}` values (mcp.fetchRemote), so upload fields are listed.
 */
export async function describeForm(
	form: FormBuilder,
	at: SurfaceOptions = {},
): Promise<FormDescription> {
	return (await analyse(form, at)).described;
}

/**
 * Why an executable submitting `form` cannot pass over MCP, or null: every
 * field is excluded, or (when the executable validates) an excluded one is required.
 */
export async function unfillableReason(
	form: FormBuilder | null,
	validated: boolean,
	files = false,
): Promise<string | null> {
	if (form === null) {
		return null;
	}
	const { described, required } = await analyse(form, { files });
	if (described.fields.length === 0 && described.excludedFields !== undefined) {
		return ALL_EXCLUDED;
	}
	if (!validated || required.length === 0) {
		return null;
	}
	const names = required.map((f) => `"${f.name}"`).join(", ");
	const kinds = [...new Set(required.map((f) => f.kind))].join(", ");
	return required.length === 1
		? `field ${names} is required and cannot be filled over MCP (${kinds})`
		: `fields ${names} are required and cannot be filled over MCP (${kinds})`;
}
