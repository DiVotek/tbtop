import { collectRules, type Field, type FormBuilder, type Rules } from "../../dsl";
import { fieldsByKey } from "../../dsl/ruleWalker";
import { describeFields } from "./formFields";

const ALL_EXCLUDED = "every field of its form is one MCP cannot fill (upload/media)";

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

async function analyse(form: FormBuilder) {
	const { fields, rules } = formShape(form);
	const described = await describeFields(fields, rules);
	const shown = new Set(
		described.fields.filter((f) => f.kind !== "password").map((f) => String(f.name)),
	);
	const values = Object.fromEntries(
		Object.entries(form.recordData()).filter(([key]) => shown.has(key)),
	);
	const out: FormDescription = {
		form: form.name,
		fields: described.fields,
		...(described.excluded.length > 0 ? { excludedFields: described.excluded } : {}),
		...(Object.keys(values).length > 0 ? { values } : {}),
	};
	return { described: out, required: described.required };
}

/** FormArguments::describe(): kind, label, options and Laravel rules per field. */
export async function describeForm(form: FormBuilder): Promise<FormDescription> {
	return (await analyse(form)).described;
}

/**
 * Why an executable submitting `form` cannot pass over MCP, or null: every
 * field is excluded, or (when the executable validates) an excluded one is required.
 */
export async function unfillableReason(
	form: FormBuilder | null,
	validated: boolean,
): Promise<string | null> {
	if (form === null) {
		return null;
	}
	const { described, required } = await analyse(form);
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
