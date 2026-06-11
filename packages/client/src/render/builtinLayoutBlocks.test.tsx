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
// Default class names — baseline unchanged when no flex options are set
// ---------------------------------------------------------------------------

test("RowBlock without options renders default flex-row gap-2", () => {
	const node = s.row([]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex");
	expect(el.className).toContain("flex-row");
	expect(el.className).toContain("gap-2");
});

test("StackBlock without options renders default flex-col gap-4", () => {
	const node = s.stack([]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex");
	expect(el.className).toContain("flex-col");
	expect(el.className).toContain("gap-4");
});

// ---------------------------------------------------------------------------
// RowBlock with flex options
// ---------------------------------------------------------------------------

test("RowBlock justify:between renders justify-between class", () => {
	const node = s.row([], { justify: "between" });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("justify-between");
});

test("RowBlock align:center renders items-center class", () => {
	const node = s.row([], { align: "center" });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("items-center");
});

test("RowBlock gap:6 overrides default gap with gap-6", () => {
	const node = s.row([], { gap: 6 });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-6");
	expect(el.className).not.toContain("gap-2");
});

test("RowBlock wrap:true renders flex-wrap class", () => {
	const node = s.row([], { wrap: true });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex-wrap");
});

test("RowBlock with justify:between align:center wrap:true renders all mapped classes", () => {
	const node = s.row([], { justify: "between", align: "center", gap: 4, wrap: true });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("justify-between");
	expect(el.className).toContain("items-center");
	expect(el.className).toContain("gap-4");
	expect(el.className).toContain("flex-wrap");
	// Base classes still present
	expect(el.className).toContain("flex");
	expect(el.className).toContain("flex-row");
});

// ---------------------------------------------------------------------------
// StackBlock with flex options
// ---------------------------------------------------------------------------

test("StackBlock gap:0 overrides default gap with gap-0", () => {
	const node = s.stack([], { gap: 0 });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-0");
	expect(el.className).not.toContain("gap-4");
});

test("StackBlock justify:center renders justify-center class", () => {
	const node = s.stack([], { justify: "center" });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("justify-center");
});

test("StackBlock align:stretch renders items-stretch class", () => {
	const node = s.stack([], { align: "stretch" });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("items-stretch");
});

test("StackBlock wrap:true renders flex-wrap class", () => {
	const node = s.stack([], { wrap: true });
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("flex-wrap");
});

// ---------------------------------------------------------------------------
// Unknown gap values fall back to the default gap
// ---------------------------------------------------------------------------

test("RowBlock unknown gap (> 12) falls back to default gap-2", () => {
	// Simulate a raw node that bypasses TypeScript types
	const node = { kind: "row", options: { gap: 99 }, meta: {} } as never;
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toContain("gap-2");
	expect(el.className).not.toContain("gap-99");
});
