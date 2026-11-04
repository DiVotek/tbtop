import { type EnumSource, enumBadgeEntries, isEnumSource } from "./options";

export type BadgeEntry = { label?: string | null; color?: string | null };
export type BadgeMap = Record<string, BadgeEntry> | EnumSource;

export interface BooleanStyle {
	trueIcon?: string;
	falseIcon?: string;
	trueColor?: string;
	falseColor?: string;
}

/** Boolean kind meta: only the keys that were set (KindMetaBuilder::booleanMeta). */
export function booleanMeta(style: BooleanStyle = {}): Record<string, string> {
	const meta: Record<string, string> = {};
	for (const key of ["trueIcon", "falseIcon", "trueColor", "falseColor"] as const) {
		const value = style[key];
		if (value !== undefined) {
			meta[key] = value;
		}
	}
	return meta;
}

/** Badge kind meta: colors always, labels only when some entry has one. */
export function badgeMeta(map: BadgeMap): Record<string, Record<string, string>> {
	const entries = isEnumSource(map) ? enumBadgeEntries(map) : descriptors(map);
	const colors: Record<string, string> = {};
	const labels: Record<string, string> = {};
	for (const [value, entry] of Object.entries(entries)) {
		if (entry.color) {
			colors[value] = entry.color;
		}
		if (entry.label) {
			labels[value] = entry.label;
		}
	}
	return Object.keys(labels).length === 0 ? { colors } : { colors, labels };
}

function descriptors(map: Record<string, BadgeEntry>): Record<string, BadgeEntry> {
	const out: Record<string, BadgeEntry> = {};
	for (const [value, entry] of Object.entries(map)) {
		const unknown = Object.keys(entry).find((key) => key !== "label" && key !== "color");
		if (unknown !== undefined) {
			throw new Error(
				`badge(): unknown key "${unknown}" in the entry for value "${value}"; use 'label' and/or 'color'.`,
			);
		}
		if (entry.label === "") {
			throw new Error(`badge(): 'label' for value "${value}" must be a non-empty string.`);
		}
		out[value] = entry;
	}
	return out;
}
