import { afterEach, beforeEach, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { type StructureNode, s } from "../structure/structure";
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

// ---------------------------------------------------------------------------
// TabsBlock — interactive switching + icon/badge
// ---------------------------------------------------------------------------

test("TabsBlock switches the visible panel when a trigger is clicked", () => {
	const body = (content: string): StructureNode => ({
		kind: "displayText",
		options: { content },
		meta: {},
	});
	const node = s.tabs([
		s.tab("General", body("First panel"), { icon: "star", badge: "2" }),
		s.tab("Advanced", body("Second panel")),
	]);
	const { getByTestId, getByText, queryByText } = render(renderNode(node));

	expect(getByText("First panel")).toBeTruthy();
	expect(queryByText("Second panel")).toBeNull();
	expect(getByTestId("tab-badge-General").textContent).toBe("2");

	fireEvent.mouseDown(getByTestId("tab-Advanced"));

	expect(getByText("Second panel")).toBeTruthy();
	expect(queryByText("First panel")).toBeNull();
});

// ---------------------------------------------------------------------------
// GridBlock — breakpoint cols
// ---------------------------------------------------------------------------

function textNode(content: string): StructureNode {
	return { kind: "displayText", options: { content }, meta: {} };
}

test("GridBlock with an int cols renders the back-compat responsive classes", () => {
	const node = s.grid({ cols: 3 }, [textNode("a")]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toBe("grid gap-4 grid-cols-1 md:grid-cols-3");
});

test("GridBlock with a breakpoint object cols renders each prefixed class", () => {
	const node = s.grid({ cols: { sm: 1, md: 2, lg: 4 } }, [textNode("a")]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toBe(
		"grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
	);
});

test("GridBlock with no cols defaults to a single column", () => {
	const node = s.grid({}, [textNode("a")]);
	const { container } = render(renderNode(node));
	const el = container.firstElementChild as HTMLElement;
	expect(el.className).toBe("grid gap-4 grid-cols-1");
});

// ---------------------------------------------------------------------------
// SectionBlock — description / icon / aside / collapsible / columns
// ---------------------------------------------------------------------------

test("SectionBlock renders title and description", () => {
	const node = s.section({ title: "Billing", description: "Payment details" }, [textNode("x")]);
	const { getByText } = render(renderNode(node));
	expect(getByText("Billing")).toBeTruthy();
	expect(getByText("Payment details")).toBeTruthy();
});

test("SectionBlock renders an icon", () => {
	const node = s.section({ title: "Billing", icon: "star" }, [textNode("x")]);
	const { container } = render(renderNode(node));
	expect(container.querySelector("svg")).not.toBeNull();
});

test("SectionBlock renders the aside child in its own slot", () => {
	const node = s.section({ title: "Profile", aside: textNode("Note") }, [textNode("Body")]);
	const { getByTestId, getByText } = render(renderNode(node));
	expect(getByTestId("section-aside").textContent).toBe("Note");
	expect(getByText("Body")).toBeTruthy();
});

test("SectionBlock columns renders children in a grid with the resolved classes", () => {
	const node = s.section({ title: "Grid section", columns: 2 }, [textNode("a"), textNode("b")]);
	const { getByTestId } = render(renderNode(node));
	const section = getByTestId("section-block");
	const body = section.querySelector("section > div:last-child") as HTMLElement;
	expect(body.className).toContain("grid-cols-1 md:grid-cols-2");
});

test("SectionBlock collapsible:true starts expanded by default and hides on toggle", () => {
	const node = s.section({ title: "Advanced", collapsible: true }, [textNode("Hidden?")]);
	const { getByTestId, getByText, queryByText } = render(renderNode(node));
	expect(getByText("Hidden?")).toBeTruthy();
	fireEvent.click(getByTestId("section-toggle"));
	expect(queryByText("Hidden?")).toBeNull();
});

test("SectionBlock collapsible with collapsed:true starts collapsed", () => {
	const node = s.section({ title: "Advanced", collapsible: true, collapsed: true }, [
		textNode("Hidden initially"),
	]);
	const { queryByText, getByTestId, getByText } = render(renderNode(node));
	expect(queryByText("Hidden initially")).toBeNull();
	fireEvent.click(getByTestId("section-toggle"));
	expect(getByText("Hidden initially")).toBeTruthy();
});

test("SectionBlock aside stays visible when a collapsible section is collapsed", () => {
	const node = s.section({ title: "Advanced", aside: textNode("Status"), collapsible: true }, [
		textNode("Body"),
	]);
	const { getByTestId, queryByText } = render(renderNode(node));
	fireEvent.click(getByTestId("section-toggle"));
	expect(queryByText("Body")).toBeNull();
	expect(getByTestId("section-aside").textContent).toBe("Status");
});

// ---------------------------------------------------------------------------
// Field colSpan/colStart — generic column-placement wrapping
// ---------------------------------------------------------------------------

test("a grid child with colSpan gets the field-col-place class and --col-span var", () => {
	const node = s.grid({ cols: 4 }, [
		{ kind: "displayText", options: { content: "wide", colSpan: 2 }, meta: {} },
	]);
	const { getByText } = render(renderNode(node));
	const wrapper = getByText("wide").closest(".field-col-place") as HTMLElement;
	expect(wrapper).not.toBeNull();
	expect(wrapper.style.getPropertyValue("--col-span")).toBe("2");
});

test("a grid child with a breakpoint colStart gets per-breakpoint --col-start-* vars", () => {
	const node = s.grid({ cols: 4 }, [
		{ kind: "displayText", options: { content: "shifted", colStart: { md: 2 } }, meta: {} },
	]);
	const { getByText } = render(renderNode(node));
	const wrapper = getByText("shifted").closest(".field-col-place") as HTMLElement;
	expect(wrapper.style.getPropertyValue("--col-start-md")).toBe("2");
});

test("a child without colSpan/colStart is not wrapped in field-col-place", () => {
	const node = s.grid({ cols: 2 }, [textNode("plain")]);
	const { getByText } = render(renderNode(node));
	expect(getByText("plain").closest(".field-col-place")).toBeNull();
});
