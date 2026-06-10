import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { render } from "@testing-library/react";
import { s } from "../structure/structure";
import { clearBlockRegistry, getBlockDescriptor } from "./blockRegistry";
import { defineBlock } from "./defineBlock";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

function Hello({ name }: { name: string }) {
	return <span data-testid="hello">Hello {name}</span>;
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

test("Renderer re-registers builtins after the registry Map is cleared", () => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
	expect(getBlockDescriptor("form")).toBeDefined();
});

test("Renderer renders a builtin widget block via the registry", () => {
	const node = s.widget({ component: Hello, props: { name: "World" } });
	const { getByTestId } = render(renderNode(node));
	expect(getByTestId("hello").textContent).toBe("Hello World");
});

test("Renderer recurses through a stack container", () => {
	const node = s.stack([
		s.widget({ component: Hello, props: { name: "A" } }),
		s.widget({ component: Hello, props: { name: "B" } }),
	]);
	const { getAllByTestId } = render(renderNode(node));
	const items = getAllByTestId("hello");
	expect(items[0]?.textContent).toBe("Hello A");
	expect(items[1]?.textContent).toBe("Hello B");
});

test("Renderer emits a static grid-cols class so Tailwind can detect it", () => {
	const node = s.grid({ cols: 3 }, [s.widget({ component: Hello, props: { name: "A" } })]);
	const { container } = render(renderNode(node));
	const grid = container.querySelector("div.grid");
	expect(grid?.className).toContain("grid-cols-3");
});

test("Renderer clamps grid cols outside the 1-8 class map to grid-cols-1", () => {
	const node = s.grid({ cols: 9 }, [s.widget({ component: Hello, props: { name: "A" } })]);
	const { container } = render(renderNode(node));
	const grid = container.querySelector("div.grid");
	expect(grid?.className).toContain("grid-cols-1");
	expect(grid?.className).not.toContain("grid-cols-9");
});

test("Renderer renders UnknownBlock and warns once per kind per session", () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	const node = { kind: "mysteryWidget" } as never;
	const first = render(renderNode(node));
	expect(first.getByTestId("unknown-block").textContent).toContain("mysteryWidget");
	render(renderNode(node));
	render(renderNode(node));
	expect(warn).toHaveBeenCalledTimes(1);
	const otherNode = { kind: "anotherMystery" } as never;
	render(renderNode(otherNode));
	expect(warn).toHaveBeenCalledTimes(2);
	warn.mockRestore();
});

test("Renderer uses a later-registered plugin descriptor and does not re-warn", () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	const node = { kind: "plugin-late" } as never;
	render(renderNode(node));
	expect(warn).toHaveBeenCalledTimes(1);
	const callsBefore = warn.mock.calls.length;
	defineBlock("plugin-late", { behavior: "leaf", render: () => <span>ok</span> });
	const { getByText } = render(renderNode(node));
	expect(getByText("ok")).toBeTruthy();
	expect(warn).toHaveBeenCalledTimes(callsBefore);
	warn.mockRestore();
});
