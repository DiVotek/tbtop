export interface Row {
	id: string;
	key: string;
	value: string;
}

export function rowsFromValue(value: Record<string, string> | null | undefined): Row[] {
	if (!value || Object.keys(value).length === 0) {
		return [];
	}
	return Object.entries(value).map(([k, v]) => ({
		id: crypto.randomUUID(),
		key: k,
		value: v,
	}));
}

export function findDuplicateKeys(rows: Row[]): Set<string> {
	const seen = new Set<string>();
	const dupes = new Set<string>();
	for (const row of rows) {
		if (row.key === "") {
			continue;
		}
		if (seen.has(row.key)) {
			dupes.add(row.key);
		} else {
			seen.add(row.key);
		}
	}
	return dupes;
}
