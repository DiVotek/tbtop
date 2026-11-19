import type { UploadValue } from "./uploadUtils";

export function uploadValues(
	value: UploadValue | UploadValue[] | string | string[] | null,
): UploadValue[] {
	if (!value) {
		return [];
	}
	const items = Array.isArray(value) ? value : [value];
	return items.map((item) => (typeof item === "string" ? { path: item, url: "" } : item));
}
