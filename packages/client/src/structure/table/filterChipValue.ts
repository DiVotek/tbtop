/**
 * Turns an applied filter value into the text its chip shows. Pure: the
 * async-select chip resolves labels itself and passes them in as `known`.
 */
import { isOn } from "../../fields/booleanValue";
import { parseDay } from "../../fields/daterangeDisabled";
import { formatDay } from "../../fields/dateValue";
import { optionLabel } from "../../fields/optionLabel";
import type { StaticOption } from "../../fields/selectShared";
import type { Translate } from "../../i18n/i18n";
import type { StructureNode } from "../types";
import { isActiveFilterValue } from "./useColumnVisibility";

export interface ActiveFilter {
	name: string;
	label: string;
	node: StructureNode;
	value: unknown;
}

interface FormatArgs {
	kind: string;
	value: unknown;
	options?: StaticOption[];
	locale: string;
	t: Translate;
}

const CHOICE_KINDS = new Set(["select", "radio", "togglebuttons", "checkboxlist", "in", "tags"]);

/** Applied filters in declaration order, skipping empty values and undeclared names. */
export function activeFilters(
	filters: StructureNode[],
	applied: Record<string, unknown> | undefined,
): ActiveFilter[] {
	return filters.flatMap((node) => {
		const name = node.name ?? "";
		const value = applied?.[name];
		if (!name || !isActiveFilterValue(value)) {
			return [];
		}
		const label = (node.options as { label?: string } | undefined)?.label ?? name;
		return [{ name, label, node, value }];
	});
}

/** Chip text after the label; undefined when the label alone says it (a boolean that is on). */
export function formatFilterValue({
	kind,
	value,
	options,
	locale,
	t,
}: FormatArgs): string | undefined {
	if (kind === "boolean" || kind === "checkbox") {
		return isOn(value) ? undefined : t("table.filters.chip.no");
	}
	if (kind === "daterange") {
		return formatBounds(value, locale, t);
	}
	if (kind === "date") {
		return formatIsoDay(value, locale);
	}
	if (CHOICE_KINDS.has(kind)) {
		return toStrings(value)
			.map((v) => optionLabel(v, options))
			.join(", ");
	}
	return toStrings(value).join(", ");
}

/** Values as strings: records and URLs carry ints and arrays alike. */
export function toStrings(value: unknown): string[] {
	const list = Array.isArray(value) ? value : [value];
	return list.filter((v) => v !== null && v !== undefined && v !== "").map(String);
}

function formatIsoDay(value: unknown, locale: string): string {
	const raw = typeof value === "string" ? value : "";
	return formatDay(parseDay(raw), locale) || raw;
}

function formatBounds(value: unknown, locale: string, t: Translate): string {
	const range = (value ?? {}) as { from?: unknown; to?: unknown };
	const from = range.from ? formatIsoDay(range.from, locale) : "";
	const to = range.to ? formatIsoDay(range.to, locale) : "";
	if (from && to) {
		return `${from} – ${to}`;
	}
	if (from) {
		return t("table.filters.chip.from").replace("{date}", from);
	}
	return t("table.filters.chip.until").replace("{date}", to);
}
