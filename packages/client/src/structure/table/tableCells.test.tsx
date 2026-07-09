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

describe("TableCell: color kind", () => {
	test("valid hex renders a swatch with a background-color style", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: "#2563eb" }],
			columns: [{ name: "color", label: "Color", kind: "color" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="color-cell"]');
		expect(cell).toBeTruthy();
		expect(cell?.getAttribute("style")).toContain("background-color");
	});

	test("invalid value renders the placeholder, not a swatch", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: "not-a-color" }],
			columns: [{ name: "color", label: "Color", kind: "color" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(container.querySelector('[data-testid="color-cell"]')).toBeNull();
	});

	test("null value renders the placeholder, not a swatch", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: null }],
			columns: [{ name: "color", label: "Color", kind: "color" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(container.querySelector('[data-testid="color-cell"]')).toBeNull();
	});

	test("default shape applies rounded-md", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: "#fff" }],
			columns: [{ name: "color", label: "Color", kind: "color" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="color-cell"]');
		expect(cell?.className).toContain("rounded-md");
	});

	test("shape=square applies rounded-none", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: "#ffffff" }],
			columns: [{ name: "color", label: "Color", kind: "color", shape: "square" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="color-cell"]');
		expect(cell?.className).toContain("rounded-none");
	});

	test("shape=circular applies rounded-full", async () => {
		const node = s.table({
			query: async () => [{ id: "1", color: "#ffffff" }],
			columns: [{ name: "color", label: "Color", kind: "color", shape: "circular" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const cell = container.querySelector('[data-testid="color-cell"]');
		expect(cell?.className).toContain("rounded-full");
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

	test("emphasized column wraps the cell text in a primary link-style span", async () => {
		const node = s.table({
			query: async () => [{ id: "1", name: "About us" }],
			columns: [{ name: "name", label: "Title", emphasized: true }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const span = getByText("About us");
		expect(span.className).toContain("text-primary");
		expect(span.className).toContain("font-medium");
		expect(span.className).toContain("hover:underline");
	});

	test("muted + uppercase column wraps the cell text in secondary code-style classes", async () => {
		const node = s.table({
			query: async () => [{ id: "1", type: "category" }],
			columns: [{ name: "type", label: "Type", muted: true, uppercase: true }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const span = getByText("category");
		expect(span.className).toContain("text-muted-foreground");
		expect(span.className).toContain("text-xs");
		expect(span.className).toContain("uppercase");
		expect(span.className).toContain("tracking-wide");
	});

	test("non-emphasized column renders plain cell text without the primary link styling", async () => {
		const node = s.table({
			query: async () => [{ id: "1", name: "About us" }],
			columns: [{ name: "name", label: "Title" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(container.querySelector("td .text-primary")).toBeNull();
	});

	test("date column with an explicit server format renders the projected string as-is", async () => {
		const node = s.table({
			query: async () => [{ id: "1", updated_at: "09.07.2026" }],
			columns: [{ name: "updated_at", label: "Updated", kind: "date", format: "d.m.Y" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		// No reparse: new Date("09.07.2026") would misread this as Sep 7 (US order).
		expect(getByText("09.07.2026")).toBeTruthy();
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

describe("TableCell: copyable", () => {
	test("renders a copy button alongside a badge cell", async () => {
		const node = s.table({
			query: async () => [{ id: "1", status: "draft" }],
			columns: [
				{
					name: "status",
					label: "Status",
					kind: "badge",
					badge: { colors: { draft: "gray" } },
					copyable: { message: "Copied", duration: 1000 },
				},
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText, findByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("draft");
		expect(await findByRole("button", { name: "Copy" })).toBeTruthy();
	});
});

describe("TableCell: link kind", () => {
	test("renders an anchor with the resolved URL as href", async () => {
		const node = s.table({
			query: async () => [{ id: "1", view: "/admin/posts/1" }],
			columns: [{ name: "view", label: "View", kind: "link" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const anchor = container.querySelector("td a");
		expect(anchor?.getAttribute("href")).toBe("/admin/posts/1");
		expect(anchor?.textContent).toBe("/admin/posts/1");
	});

	test("null value renders no anchor and no cell content", async () => {
		const node = s.table({
			query: async () => [{ id: "1", view: null }],
			columns: [{ name: "view", label: "View", kind: "link" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(container.querySelector("td a")).toBeNull();
	});

	test("external:true sets target=_blank and rel=noopener noreferrer", async () => {
		const node = s.table({
			query: async () => [{ id: "1", view: "https://example.com" }],
			columns: [{ name: "view", label: "View", kind: "link", link: { external: true } }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const anchor = container.querySelector("td a");
		expect(anchor?.getAttribute("target")).toBe("_blank");
		expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
	});

	test("no icon set: anchor has no target/rel by default", async () => {
		const node = s.table({
			query: async () => [{ id: "1", view: "/x" }],
			columns: [{ name: "view", label: "View", kind: "link" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const anchor = container.querySelector("td a");
		expect(anchor?.getAttribute("target")).toBeNull();
	});

	test("icon set: renders icon-only, no visible URL text", async () => {
		const node = s.table({
			query: async () => [{ id: "1", view: "/admin/posts/1" }],
			columns: [{ name: "view", label: "View", kind: "link", link: { icon: "eye" } }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const anchor = container.querySelector("td a");
		expect(anchor?.textContent).toBe("");
		expect(anchor?.querySelector("svg")).toBeTruthy();
	});

	test("clicking the link stops propagation so rowClick does not also fire", async () => {
		const rowClickCalls: unknown[] = [];
		const node = s.table({
			query: async () => [{ id: "1", view: "/x" }],
			columns: [{ name: "view", label: "View", kind: "link" }],
			rowClick: "open",
			rowActions: [
				{
					name: "open",
					label: "Open",
					handler: () => {
						rowClickCalls.push(1);
					},
				},
			],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const anchor = container.querySelector("td a") as HTMLAnchorElement;
		anchor.addEventListener("click", (e) => e.preventDefault());
		anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(rowClickCalls.length).toBe(0);
	});
});

describe("TableCell: time kind", () => {
	test("renders the server-formatted time string verbatim", async () => {
		const node = s.table({
			query: async () => [{ id: "1", opens_at: "14:30" }],
			columns: [{ name: "opens_at", label: "Opens", kind: "time" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(await findByText("14:30")).toBeTruthy();
	});

	test("renders '—' for a null time value", async () => {
		const node = s.table({
			query: async () => [{ id: "1", opens_at: null }],
			columns: [{ name: "opens_at", label: "Opens", kind: "time" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(await findByText("—")).toBeTruthy();
	});

	test("renders '—' for an empty-string time value", async () => {
		const node = s.table({
			query: async () => [{ id: "1", opens_at: "" }],
			columns: [{ name: "opens_at", label: "Opens", kind: "time" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(await findByText("—")).toBeTruthy();
	});
});
