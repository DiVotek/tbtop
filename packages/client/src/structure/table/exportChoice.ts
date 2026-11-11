/**
 * What the export dialog offers and remembers: the exportable columns (a
 * group contributes its children), which start ticked, and the user's last
 * pick per table in localStorage.
 */
import { useCallback, useState } from "react";
import type { TableColumn } from "../types";
import { tableStateKey } from "./useColumnLayout";

export interface ExportColumn {
	name: string;
	label: string;
}

export interface ExportChoice {
	columns: string[];
	format: string;
}

export function exportColumns(columns: TableColumn[]): ExportColumn[] {
	return columns
		.flatMap((col) => (col.kind === "group" ? (col.columns ?? []) : [col]))
		.map(toOption);
}

function toOption(col: TableColumn): ExportColumn {
	return { name: col.name, label: col.export?.label ?? col.label ?? col.name };
}

/** Ticked by default: shown in the table (a group child follows its group) and not export(enabled: false). */
export function defaultTicked(columns: TableColumn[], visible: Set<string>): string[] {
	return columns.flatMap((col) => {
		if (!visible.has(col.name)) {
			return [];
		}
		const leaves = col.kind === "group" ? (col.columns ?? []) : [col];
		return leaves.filter((leaf) => leaf.export?.on !== false).map((leaf) => leaf.name);
	});
}

function readChoice(key: string): Partial<ExportChoice> {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
		return typeof parsed === "object" && parsed !== null
			? (parsed as Partial<ExportChoice>)
			: {};
	} catch {
		return {};
	}
}

interface ChoiceInput {
	tableName: string;
	columns: TableColumn[];
	available: ExportColumn[];
	ticked: string[];
	formats: string[];
}

/** The remembered pick, cut back to columns and formats that still exist. */
export function useExportChoice(input: ChoiceInput) {
	const key = tableStateKey(input.columns, input.tableName, "export");
	const [choice, setChoice] = useState<ExportChoice>(() => initialChoice(key, input));
	const update = useCallback(
		(next: ExportChoice) => {
			setChoice(next);
			try {
				localStorage.setItem(key, JSON.stringify(next));
			} catch {
				// storage is a convenience
			}
		},
		[key],
	);
	return [choice, update] as const;
}

function initialChoice(key: string, input: ChoiceInput): ExportChoice {
	const stored = readChoice(key);
	const names = new Set(input.available.map((c) => c.name));
	const columns = Array.isArray(stored.columns)
		? stored.columns.filter((n): n is string => typeof n === "string" && names.has(n))
		: input.ticked;
	const format =
		typeof stored.format === "string" && input.formats.includes(stored.format)
			? stored.format
			: (input.formats[0] ?? "csv");
	return { columns: columns.length > 0 ? columns : input.ticked, format };
}
