type Bag = Record<string, unknown>;

/**
 * Reads/writes a `collectDependentFields` path ("car_id", "items.0.car_id")
 * against the nested data shape a repeater actually stores: `items` is an
 * array of row bags, not a flat "items.0.car_id" key. Segments alternate
 * bag-key / array-index by construction (the walker only ever descends
 * through a repeater's own array), so a numeric segment always means "index
 * into the array read at the previous segment".
 */
export function readPath(data: Bag, path: string): unknown {
	const segments = path.split(".");
	let cursor: unknown = data;
	for (const segment of segments) {
		cursor = readSegment(cursor, segment);
	}
	return cursor;
}

function readSegment(cursor: unknown, segment: string): unknown {
	if (Array.isArray(cursor)) {
		return cursor[Number(segment)];
	}
	if (isBag(cursor)) {
		return cursor[segment];
	}
	return undefined;
}

/** Returns a new root bag with `path` set to `value`, copying only the touched spine. */
export function writePath(data: Bag, path: string, value: unknown): Bag {
	const segments = path.split(".");
	return setSegment(data, segments, value) as Bag;
}

function setSegment(cursor: unknown, segments: string[], value: unknown): unknown {
	const [head, ...rest] = segments;
	if (head === undefined) {
		return value;
	}
	if (rest.length === 0) {
		return withKey(cursor, head, value);
	}
	const child = readSegment(cursor, head);
	return withKey(cursor, head, setSegment(child, rest, value));
}

function withKey(cursor: unknown, key: string, value: unknown): unknown {
	if (Array.isArray(cursor)) {
		const copy = [...cursor];
		copy[Number(key)] = value;
		return copy;
	}
	const base = isBag(cursor) ? cursor : {};
	return { ...base, [key]: value };
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
