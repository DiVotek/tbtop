import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { s } from "../structure/structure";
import { wrapForStructure } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import { clearBlockRegistry } from "./blockRegistry";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

function node(kind: string, options: Record<string, unknown>): StructureNode {
	return { kind, options, meta: {} };
}

const text = { kind: "displayText", options: { content: "hello" }, meta: {} };

describe("section variant card", () => {
	test("wraps content in a bordered card with the header inside", () => {
		const { getByTestId, getByText } = render(
			renderNode(
				node("section", { title: "Recently updated", variant: "card", children: [text] }),
			),
		);
		const card = getByTestId("section-card");
		expect(card.className).toContain("rounded-lg");
		expect(card.className).toContain("border");
		expect(card.className).toContain("bg-card");
		const heading = getByText("Recently updated");
		expect(heading.tagName).toBe("H3");
		expect(heading.className).toContain("text-sm");
		expect(heading.className).toContain("font-semibold");
		// header row lives INSIDE the card and separates with border-b
		expect(card.contains(heading)).toBe(true);
		expect(heading.parentElement?.className).toContain("border-b");
		expect(getByText("hello")).toBeTruthy();
	});

	test("renders the action link right-aligned in the card header", () => {
		const { getByTestId } = render(
			renderNode(
				node("section", {
					title: "Pages",
					variant: "card",
					action: { label: "Open pages", url: "/admin/pages" },
					children: [],
				}),
			),
		);
		const link = getByTestId("section-action");
		expect(link.getAttribute("href")).toBe("/admin/pages");
		expect(link.className).toContain("text-muted-foreground");
	});

	test("no header row when title and action are absent", () => {
		const { getByTestId } = render(
			renderNode(node("section", { variant: "card", children: [text] })),
		);
		expect(getByTestId("section-card").querySelector(".border-b")).toBeNull();
	});

	test("a table inside a card section drops its own border frame", async () => {
		const table = s.table({ query: async () => [], columns: [{ name: "title" }] });
		const section = node("section", { title: "Rows", variant: "card", children: [table] });
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { findByTestId, getByTestId } = render(<Wrap>{renderNode(section)}</Wrap>);
		await findByTestId("table-block");
		const shell = getByTestId("section-card").querySelector(".overflow-x-auto") as HTMLElement;
		expect(shell.className).not.toContain("border");
	});

	test("a standalone table keeps its border frame (control)", async () => {
		const table = s.table({ query: async () => [], columns: [{ name: "title" }] });
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(table)}</Wrap>);
		await findByTestId("table-block");
		const shell = container.querySelector(".overflow-x-auto") as HTMLElement;
		expect(shell.className).toContain("border");
	});
});

describe("section variant plain", () => {
	test("renders the title as an uppercase muted label without a card", () => {
		const { getByText, queryByTestId } = render(
			renderNode(node("section", { title: "Browse", variant: "plain", children: [text] })),
		);
		const label = getByText("Browse");
		expect(label.className).toContain("uppercase");
		expect(label.className).toContain("tracking-wide");
		expect(label.className).toContain("text-muted-foreground");
		expect(label.className).toContain("mb-3");
		expect(queryByTestId("section-card")).toBeNull();
	});
});

describe("section without variant", () => {
	test("keeps the default render (no card, h2 title)", () => {
		const { getByText, queryByTestId } = render(
			renderNode(node("section", { title: "Default", children: [text] })),
		);
		expect(getByText("Default").tagName).toBe("H2");
		expect(queryByTestId("section-card")).toBeNull();
		expect(queryByTestId("section-plain")).toBeNull();
	});
});

describe("row variant grid", () => {
	test("renders a responsive grid with bordered card cells", () => {
		const { getByTestId, getAllByTestId } = render(
			renderNode(node("row", { variant: "grid", children: [text, text, text] })),
		);
		const grid = getByTestId("row-grid");
		expect(grid.className).toContain("grid-cols-2");
		expect(grid.className).toContain("sm:grid-cols-3");
		expect(grid.className).toContain("lg:grid-cols-4");
		const cells = getAllByTestId("row-grid-item");
		expect(cells).toHaveLength(3);
		expect(cells[0]?.className).toContain("rounded-md");
		expect(cells[0]?.className).toContain("border");
		expect(cells[0]?.className).toContain("bg-card");
	});

	test("row without variant keeps the default inline flex render", () => {
		const { container, queryByTestId } = render(renderNode(node("row", { children: [text] })));
		expect(queryByTestId("row-grid")).toBeNull();
		expect((container.firstElementChild as HTMLElement).className).toBe("flex flex-row gap-2");
	});
});
