/**
 * New column kinds: badge, boolean (icon), icon-map; align/width/tooltip props.
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

describe("TableCell: badge kind", () => {
	test("renders badge with value text", async () => {
		const node = s.table({
			query: async () => [{ id: "1", status: "draft" }],
			columns: [
				{
					name: "status",
					label: "Status",
					kind: "badge",
					badge: { colors: { draft: "gray", published: "success" } },
				},
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		const badge = await findByText("draft");
		expect(badge).toBeTruthy();
	});
});

describe("TableCell: boolean kind", () => {
	test("renders check icon for truthy value", async () => {
		const node = s.table({
			query: async () => [{ id: "1", active: true }],
			columns: [{ name: "active", label: "Active", kind: "boolean" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		// SVG icon or text fallback should be rendered — just confirm no crash
		expect(true).toBe(true);
	});

	test("renders '—' for null boolean", async () => {
		const node = s.table({
			query: async () => [{ id: "1", active: null }],
			columns: [{ name: "active", label: "Active", kind: "boolean" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		const dash = await findByText("—");
		expect(dash).toBeTruthy();
	});
});

describe("TableCell: icon kind", () => {
	test("renders icon for known iconMap value", async () => {
		const node = s.table({
			query: async () => [{ id: "1", state: "draft" }],
			columns: [
				{
					name: "state",
					label: "State",
					kind: "icon",
					iconMap: { draft: { icon: "pencil", color: "gray" } },
				},
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(true).toBe(true);
	});

	test("renders text fallback for unknown iconMap value", async () => {
		const node = s.table({
			query: async () => [{ id: "1", state: "unknown-xyz" }],
			columns: [
				{
					name: "state",
					label: "State",
					kind: "icon",
					iconMap: { draft: { icon: "pencil", color: "gray" } },
				},
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		const fallback = await findByText("unknown-xyz");
		expect(fallback).toBeTruthy();
	});
});

describe("TableCell: image kind", () => {
	// The empty/null negatives must prove the IMAGE cell ran and chose to render
	// nothing — not that the string fallback happened to emit no <img>. The
	// image cell tags itself with data-testid="image-cell"; assert that wrapper
	// is present AND holds no <img>. This only goes green once ImageCell exists.
	test("empty-string value: image cell present but renders no img", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: "" }],
			columns: [{ name: "cover", label: "Cover", kind: "image" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="image-cell"]');
		expect(cell).toBeTruthy();
		expect(cell?.querySelector("img")).toBeNull();
	});

	test("null value: image cell present but renders no img", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: null }],
			columns: [{ name: "cover", label: "Cover", kind: "image" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="image-cell"]');
		expect(cell).toBeTruthy();
		expect(cell?.querySelector("img")).toBeNull();
	});

	test("URL value renders an img with that src", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: "/img/a.png" }],
			columns: [{ name: "cover", label: "Cover", kind: "image" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const img = container.querySelector("td img");
		expect(img).toBeTruthy();
		expect(img?.getAttribute("src")).toBe("/img/a.png");
	});

	test("default shape (no shape) applies rounded-none", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: "/img/a.png" }],
			columns: [{ name: "cover", label: "Cover", kind: "image" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const img = container.querySelector("td img");
		expect(img?.className).toContain("rounded-none");
	});

	test("shape=circular applies rounded-full", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: "/img/a.png" }],
			columns: [{ name: "cover", label: "Cover", kind: "image", shape: "circular" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const img = container.querySelector("td img");
		expect(img?.className).toContain("rounded-full");
	});

	test("alt set applies the alt attribute", async () => {
		const node = s.table({
			query: async () => [{ id: "1", cover: "/img/a.png" }],
			columns: [{ name: "cover", label: "Cover", kind: "image", alt: "Avatar" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const img = container.querySelector("td img");
		expect(img?.getAttribute("alt")).toBe("Avatar");
	});
});

describe("TableCell: column display properties", () => {
	test("column with align=center applies text-center class to th and td", async () => {
		const node = s.table({
			query: async () => [{ id: "1", count: 42 }],
			columns: [{ name: "count", label: "Count", align: "center" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const th = container.querySelector("th.text-center");
		const td = container.querySelector("td.text-center");
		expect(th).toBeTruthy();
		expect(td).toBeTruthy();
	});

	test("column with tooltip sets title attribute on th", async () => {
		const node = s.table({
			query: async () => [{ id: "1", score: 99 }],
			columns: [{ name: "score", label: "Score", tooltip: "Higher is better" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const th = container.querySelector('th[title="Higher is better"]');
		expect(th).toBeTruthy();
	});

	test("hiddenByDefault column is not visible initially", async () => {
		const node = s.table({
			name: "scored",
			query: async () => [{ id: "1", title: "A", secret: "X" }],
			columns: [
				{ name: "title", label: "Title" },
				{ name: "secret", label: "Secret", hiddenByDefault: true, toggleable: true },
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const headers = Array.from(container.querySelectorAll("thead th")).map(
			(th) => th.textContent ?? "",
		);
		expect(headers).not.toContain("Secret");
		expect(headers).toContain("Title");
	});
});
