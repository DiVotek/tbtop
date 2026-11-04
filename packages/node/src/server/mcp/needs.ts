import { AgentError } from "./answer";

/** The record key a row carries, as the client reads it. */
const ROW_KEY = "_key";

const HINTS: Record<string, string> = {
	form: "Pass form with the fields search() lists.",
	row: "Pass a row from query().",
	selection: "Pass the `_key` of rows from query() as selection.",
};

/** A key is an int or a non-empty string: null or an array would act on the wrong rows. */
const isKey = (key: unknown) =>
	(typeof key === "number" && Number.isInteger(key)) || (typeof key === "string" && key !== "");

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * ActionNeeds::assertSent(): refuses a call that omits what the handler reads,
 * so it never runs on a missing row or selection and reports a false success.
 */
export function assertNeedsSent(id: string, needs: string[], sent: Record<string, unknown>): void {
	const given: Record<string, boolean> = {
		form: isObject(sent.form),
		row: isObject(sent.row),
		selection:
			Array.isArray(sent.selection) &&
			sent.selection.length > 0 &&
			sent.selection.every(isKey),
	};
	const missing = needs.filter((need) => given[need] === false);
	if (missing.length > 0) {
		const hints = missing.map((need) => HINTS[need]).join(" ");
		throw new AgentError(`"${id}" needs ${missing.join(", ")}. ${hints}`);
	}
	const row = sent.row;
	if (needs.includes("row") && isObject(row) && !isKey(row[ROW_KEY] ?? row.id)) {
		throw new AgentError(
			`"${id}" needs a row with its key "${ROW_KEY}". Pass a row from query() unchanged.`,
		);
	}
}

/** Row keys as the browser sends them: a canonical integer string goes back to a number. */
export function selectionKeys(value: unknown): unknown[] {
	const keys = Array.isArray(value) ? value : [];
	return keys.map((key) =>
		typeof key === "string" && /^(0|-?[1-9]\d*)$/.test(key) ? Number(key) : key,
	);
}
