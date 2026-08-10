/**
 * useColumnVisibility rules:
 * - a column absent from stored overrides follows the current default (hiddenByDefault)
 * - a stored explicit choice overrides the default
 * - a stored entry for a column that no longer exists is ignored
 * - two toggles fired before a rerender both take effect (no lost update)
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import type { TableColumn } from "../types";
import { useColumnVisibility } from "./useColumnVisibility";

interface HarnessProps {
	columns: TableColumn[];
	tableName: string;
	onReady: (visible: Set<string>, toggleColumn: (name: string) => void) => void;
}

function Harness({ columns, tableName, onReady }: HarnessProps) {
	const { visibleColumns, toggleColumn } = useColumnVisibility(columns, tableName);
	onReady(visibleColumns, toggleColumn);
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

	test("two toggles fired before a rerender both take effect", () => {
		let visible = new Set<string>();
		let toggle: (name: string) => void = () => {};
		render(
			<Harness
				columns={COLUMNS}
				tableName="books"
				onReady={(v, t) => {
					visible = v;
					toggle = t;
				}}
			/>,
		);

		act(() => {
			toggle("author");
			toggle("notes");
		});

		expect(visible.has("author")).toBe(false);
		expect(visible.has("notes")).toBe(true);

		const stored = JSON.parse(
			localStorage.getItem("tbtop:table.books.columns.v2") ?? "{}",
		) as Record<string, boolean>;
		expect(stored.author).toBe(false);
		expect(stored.notes).toBe(true);
	});
});
