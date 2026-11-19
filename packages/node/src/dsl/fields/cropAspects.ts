/** A crop aspect: 'W:H' (e.g. '16:9') or 'free' (CropAspects.php). */
export type CropAspect = "free" | `${number}:${number}`;

const PATTERN = /^(?:free|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/;

/** Validates and de-duplicates an aspect list; throws on an empty list or a bad entry. */
export function normalizeCropAspects(aspects: readonly string[]): string[] {
	if (aspects.length === 0) {
		throw new Error("Upload.cropAspects() needs at least one aspect.");
	}
	return [...new Set(aspects.map(normalizeOne))];
}

function normalizeOne(aspect: string): string {
	const value = typeof aspect === "string" ? aspect.trim() : "";
	if (!PATTERN.test(value) || hasZeroSide(value)) {
		throw new Error(
			`Invalid crop aspect '${String(aspect)}': use 'W:H' (e.g. '16:9') or 'free'.`,
		);
	}
	return value;
}

function hasZeroSide(value: string): boolean {
	if (value === "free") {
		return false;
	}
	const [w = "0", h = "0"] = value.split(":");
	return Number(w) <= 0 || Number(h) <= 0;
}
