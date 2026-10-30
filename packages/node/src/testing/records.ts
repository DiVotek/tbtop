import { fail } from "./assert";

export type Key = string | number;

/** A row as the table projects it, a stored record, or its key. */
export type RecordRef = Key | { _key?: unknown; id?: unknown; [field: string]: unknown };

export function key(record: RecordRef): Key {
	const value = typeof record === "object" ? (record._key ?? record.id) : record;
	if (typeof value !== "string" && typeof value !== "number") {
		fail(`A record is a row with _key or id, or a key; got ${JSON.stringify(record)}.`);
	}
	return value;
}

export function keys(records: RecordRef | Iterable<RecordRef>): Key[] {
	if (typeof records === "object" && Symbol.iterator in records) {
		return [...(records as Iterable<RecordRef>)].map(key);
	}
	return [key(records as RecordRef)];
}

/** The row an action is sent: a projected row as-is, a record or key as `{ _key }`. */
export function row(record: RecordRef | null | undefined): Record<string, unknown> {
	if (record == null) {
		return {};
	}
	return typeof record === "object" && "_key" in record ? { ...record } : { _key: key(record) };
}
