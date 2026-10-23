import { type FormBuilder, Richtext } from "../../dsl";
import { dataGet, dataHas, expandKey } from "../validation/data";
import { AgentError } from "./answer";
import { formShape } from "./formArgs";
import { UNSUPPORTED_KINDS } from "./formFields";
import { assertRichtextDocument } from "./richtext";

/**
 * FormInput::assertSendable(): an excluded (upload) field may come back with
 * its stored value, as an agent echoes a repeater row whole; only a changed
 * value is refused. Richtext documents are checked so the editor can open them.
 */
export function assertSendable(form: FormBuilder, input: Record<string, unknown>): void {
	const stored = form.recordData();
	const changed: string[] = [];
	for (const [key, field] of Object.entries(formShape(form).fields)) {
		if (field instanceof Richtext) {
			assertDocuments(field, key, input);
		}
		if (UNSUPPORTED_KINDS.includes(field.kind)) {
			changed.push(...changedPaths(key, input, stored));
		}
	}
	if (changed.length > 0) {
		throw new AgentError(
			`Fields listed in excludedFields cannot be changed over MCP; omit them or send their current value: ${changed.join(", ")}.`,
		);
	}
}

/** The paths under `key` whose sent value differs from the stored one. */
function changedPaths(key: string, input: Record<string, unknown>, stored: unknown): string[] {
	return sent(key, input)
		.filter(([path, value]) => canonical(value) !== canonical(dataGet(stored, path)))
		.map(([path]) => path);
}

/** A translatable richtext holds a document per locale; anything but an object there is one document. */
function assertDocuments(field: Richtext, key: string, input: Record<string, unknown>): void {
	const translatable = field.isTranslatableField();
	const documents = translatable ? sent(`${key}.*`, input) : [];
	for (const [path, value] of sent(key, input)) {
		const isLocaleBag = value !== null && typeof value === "object" && !Array.isArray(value);
		if (!translatable || !isLocaleBag) {
			documents.push([path, value]);
		}
	}
	for (const [path, document] of documents) {
		assertRichtextDocument(path, document);
	}
}

/** The input values at rule key `pattern`, by concrete path; paths not sent are skipped. */
function sent(pattern: string, input: Record<string, unknown>): [string, unknown][] {
	return expandKey(input, pattern)
		.filter((path) => !path.includes("*") && dataHas(input, path))
		.map((path) => [path, dataGet(input, path)]);
}

/** Numbers as strings, so "12" matches a stored 12, and nothing looser does. */
function canonical(value: unknown): string {
	return JSON.stringify(value, (_, v: unknown) => (typeof v === "number" ? String(v) : v)) ?? "";
}
