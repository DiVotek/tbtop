import { afterEach, beforeEach, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { s } from "../structure/structure";
import { clearBlockRegistry } from "./blockRegistry";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

// ---------------------------------------------------------------------------
// Row / Stack — restored default classes, no flex options
// ---------------------------------------------------------------------------

test("RowBlock renders default flex-row gap-2", () => {
	const node = s.row([]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toBe("flex flex-row gap-2");
});

test("StackBlock renders default flex-col gap-4", () => {
	const node = s.stack([]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toBe("flex flex-col gap-4");
});

// ---------------------------------------------------------------------------
// FlexBlock — direction
// ---------------------------------------------------------------------------

test("FlexBlock direction:row renders flex flex-row", () => {
	const node = { kind: "flex", options: { direction: "row", children: [] }, meta: {} } as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex-row");
	expect(el.className).toContain("flex");
});

test("FlexBlock direction:col renders flex flex-col", () => {
	const node = { kind: "flex", options: { direction: "col", children: [] }, meta: {} } as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex-col");
});

// ---------------------------------------------------------------------------
// FlexBlock — default gap depends on direction
// ---------------------------------------------------------------------------

test("FlexBlock direction:row defaults to gap-2", () => {
	const node = { kind: "flex", options: { direction: "row", children: [] }, meta: {} } as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-2");
});

test("FlexBlock direction:col defaults to gap-4", () => {
	const node = { kind: "flex", options: { direction: "col", children: [] }, meta: {} } as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-4");
});

// ---------------------------------------------------------------------------
// FlexBlock — flex options
// ---------------------------------------------------------------------------

test("FlexBlock justify:between renders justify-between", () => {
	const node = {
		kind: "flex",
		options: { direction: "row", justify: "between", children: [] },
		meta: {},
	} as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("justify-between");
});

test("FlexBlock align:center renders items-center", () => {
	const node = {
		kind: "flex",
		options: { direction: "row", align: "center", children: [] },
		meta: {},
	} as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("items-center");
});

test("FlexBlock gap:6 renders gap-6", () => {
	const node = {
		kind: "flex",
		options: { direction: "row", gap: 6, children: [] },
		meta: {},
	} as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-6");
	expect(el.className).not.toContain("gap-2");
});

test("FlexBlock wrap:true renders flex-wrap", () => {
	const node = {
		kind: "flex",
		options: { direction: "row", wrap: true, children: [] },
		meta: {},
	} as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex-wrap");
});

test("FlexBlock with all options renders all mapped classes", () => {
	const node = {
		kind: "flex",
		options: {
			direction: "row",
			justify: "between",
			align: "center",
			gap: 4,
			wrap: true,
			children: [],
		},
		meta: {},
	} as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex");
	expect(el.className).toContain("flex-row");
	expect(el.className).toContain("justify-between");
	expect(el.className).toContain("items-center");
	expect(el.className).toContain("gap-4");
	expect(el.className).toContain("flex-wrap");
});
