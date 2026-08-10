/**
 * useColumnVisibility rules:
 * - a column absent from stored overrides follows the current default (hiddenByDefault)
 * - a stored explicit choice overrides the default
 * - a stored entry for a column that no longer exists is ignored
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { TableColumn } from "../types";
import { useColumnVisibility } from "./useColumnVisibility";

interface HarnessProps {
	columns: TableColumn[];
	tableName: string;
	onReady: (visible: Set<string>) => void;
}

function Harness({ columns, tableName, onReady }: HarnessProps) {
	const { visibleColumns } = useColumnVisibility(columns, tableName);
	onReady(visibleColumns);
	return null;
}

function renderVisibility(columns: TableColumn[], tableName: string): Set<string> {
	let visible = new Set<string>();
	render(<Harness columns={columns} tableName={tableName} onReady={(v) => (visible = v)} />);
	return visible;
}

const COLUMNS: TableColumn[] = [
	{ name: "title" },
	{ name: "author" },
	{ name: "notes", hiddenByDefault: true },
];

beforeEach(() => {
	localStorage.clear();
});

describe("useColumnVisibility", () => {
	test("a column absent from storage follows the current default", () => {
		localStorage.setItem("tbtop:table.books.columns.v2", JSON.stringify({}));

		const visible = renderVisibility(COLUMNS, "books");

		expect(visible.has("title")).toBe(true);
		expect(visible.has("author")).toBe(true);
		expect(visible.has("notes")).toBe(false);
	});

	test("an explicit user choice overrides the default", () => {
		localStorage.setItem(
			"tbtop:table.books.columns.v2",
			JSON.stringify({ author: false, notes: true }),
		);

		const visible = renderVisibility(COLUMNS, "books");

		expect(visible.has("author")).toBe(false);
		expect(visible.has("notes")).toBe(true);
		expect(visible.has("title")).toBe(true);
	});

	test("an entry for a column that no longer exists is ignored", () => {
		localStorage.setItem(
			"tbtop:table.books.columns.v2",
			JSON.stringify({ retiredColumn: true, title: false }),
		);

		const visible = renderVisibility(COLUMNS, "books");

		expect(visible.has("title")).toBe(false);
		expect([...visible].includes("retiredColumn")).toBe(false);
	});
});
