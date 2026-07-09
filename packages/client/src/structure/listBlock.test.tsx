import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import type { ListItem } from "./listBlock";
import type { StructureNode } from "./types";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

function listNode(items: ListItem[]): StructureNode {
	return { kind: "list", name: "recent", options: { items }, meta: {} };
}

function renderList(items: ListItem[]) {
	return render(renderNode(listNode(items)));
}

describe("ListBlock", () => {
	test("renders a row per item with title and meta", () => {
		const { getAllByTestId, getByText } = renderList([
			{ title: "Home", meta: "2 min ago" },
			{ title: "About" },
		]);
		expect(getAllByTestId("list-item")).toHaveLength(2);
		expect(getByText("Home")).toBeTruthy();
		expect(getByText("2 min ago")).toBeTruthy();
		expect(getByText("About")).toBeTruthy();
	});

	test("empty items renders an empty container", () => {
		const { getByTestId, queryAllByTestId } = renderList([]);
		expect(getByTestId("list-block")).toBeTruthy();
		expect(queryAllByTestId("list-item")).toHaveLength(0);
	});

	test("status dot maps semantic colors to their classes", () => {
		const { getAllByTestId } = renderList([
			{ title: "OK", color: "success" },
			{ title: "Hmm", color: "warning" },
			{ title: "Bad", color: "danger" },
		]);
		const dots = getAllByTestId("list-item-dot");
		expect(dots[0]?.className).toContain("bg-emerald-500");
		expect(dots[1]?.className).toContain("bg-amber-500");
		expect(dots[2]?.className).toContain("bg-red-500");
	});

	test("dot defaults to muted when no color is given", () => {
		const { getByTestId } = renderList([{ title: "X" }]);
		const dot = getByTestId("list-item-dot");
		expect(dot.dataset["color"]).toBe("muted");
		expect(dot.className).toContain("bg-muted-foreground");
	});

	test("item with a url renders as a link to that url", () => {
		const { getByTestId } = renderList([{ title: "Home", url: "/admin/pages/1" }]);
		const row = getByTestId("list-item");
		expect(row.tagName).toBe("A");
		expect(row.getAttribute("href")).toBe("/admin/pages/1");
	});

	test("item without a url is not a link", () => {
		const { getByTestId } = renderList([{ title: "Static" }]);
		expect(getByTestId("list-item").tagName).not.toBe("A");
	});
});
