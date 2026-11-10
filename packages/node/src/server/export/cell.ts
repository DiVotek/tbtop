import type { Column } from "../../dsl";
import { trans } from "../../i18n";

export type Cell = string | number;

/**
 * A projected value as a file cell holds it: the text the table shows
 * (ExportCell.php). Boolean icons and badge or select labels resolve here,
 * since a file has no renderer; numbers stay numbers.
 */
export function exportCell(column: Column, value: unknown): Cell {
	if (value === null || value === undefined) {
		return "";
	}
	if (column.st.kind === "boolean" || typeof value === "boolean") {
		return trans(truthy(value) ? "export.yes" : "export.no");
	}
	return label(column, value) ?? scalar(value);
}

function truthy(value: unknown): boolean {
	if (typeof value === "string") {
		return ["1", "true", "on", "yes"].includes(value.toLowerCase());
	}
	return Boolean(value);
}

function label(column: Column, value: unknown): string | null {
	if (typeof value !== "string" && typeof value !== "number") {
		return null;
	}
	const key = String(value);
	if (column.st.kind === "badge") {
		const labels = (column.st.kindMeta.badge as { labels?: Record<string, string> } | undefined)
			?.labels;
		return labels?.[key] ?? null;
	}
	const option = column.st.editOptions.find((o) => String(o.value) === key);
	return typeof option?.label === "string" ? option.label : null;
}

function scalar(value: unknown): Cell {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : String(value);
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "bigint") {
		return value.toString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Array.isArray(value) && value.every((v) => v === null || typeof v !== "object")) {
		return value.map(listItem).join(", ");
	}
	return JSON.stringify(value) ?? "";
}

/** A list item as text: booleans as "1"/"0" (as the PHP side writes them), null as "". */
function listItem(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? "1" : "0";
	}
	return String(value ?? "");
}
