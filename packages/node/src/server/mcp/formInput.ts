import { type FormBuilder, Richtext } from "../../dsl";
import { dataGet, dataHas, expandKey } from "../validation/data";
import { AgentError } from "./answer";
import { formShape } from "./formArgs";
import { excludesKind, FILE_KINDS } from "./formFields";
import { isRemote } from "./remoteFiles";
import { assertRichtextDocument } from "./richtext";

/**
 * FormInput::assertSendable(): a file field may come back with its stored
 * value, as an agent echoes a repeater row whole, or (an upload when `files`)
 * with `{url}` references; any other change is refused. Richtext documents
 * are checked so the editor can open them.
 */
export function assertSendable(
	form: FormBuilder,
	input: Record<string, unknown>,
	files = false,
): void {
	const stored = form.recordData();
	const changed: string[] = [];
	for (const [key, field] of Object.entries(formShape(form).fields)) {
		if (field instanceof Richtext) {
			assertDocuments(field, key, input);
		}
		if (!FILE_KINDS.includes(field.kind)) {
			continue;
		}
		const remote = !excludesKind(field.kind, files);
		changed.push(
			...sent(key, input)
				.filter(([path, value]) => !unchanged(value, dataGet(stored, path), remote))
				.map(([path]) => path),
		);
	}
	if (changed.length > 0) {
		throw new AgentError(
			`Send a file field as {url} or its current value; fields listed in excludedFields only as their current value: ${changed.join(", ")}.`,
		);
	}
}

type Bag = Record<string, unknown>;
const isBag = (value: unknown): value is Bag => value !== null && typeof value === "object";

/**
 * Whether a file field's `value` keeps what is `stored`: the same value, or
 * (when `remote`) new `{url}` references beside every stored entry. Dropping
 * a stored entry is a change.
 */
function unchanged(value: unknown, stored: unknown, remote: boolean): boolean {
	if (canonical(value) === canonical(stored) || (remote && isRemote(value))) {
		return true;
	}
	if (!(remote && isBag(value) && (isBag(stored) || stored == null))) {
		return false;
	}
	const before: Bag = stored ?? {};
	return (
		Object.keys(before).every((key) => Object.hasOwn(value, key)) &&
		Object.entries(value).every(([key, entry]) => unchanged(entry, before[key], true))
	);
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
export function sent(pattern: string, input: Record<string, unknown>): [string, unknown][] {
	return expandKey(input, pattern)
		.filter((path) => !path.includes("*") && dataHas(input, path))
		.map((path) => [path, dataGet(input, path)]);
}

/** Numbers as strings, so "12" matches a stored 12, and nothing looser does. */
function canonical(value: unknown): string {
	return JSON.stringify(value, (_, v: unknown) => (typeof v === "number" ? String(v) : v)) ?? "";
}
