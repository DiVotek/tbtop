import { afterEach, beforeEach, expect, test } from "bun:test";
import { render } from "@testing-library/react";
// Import via the package root to test the public export path.
import { registerBlock } from "../index";
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

test("RegisterBlock: registered testWidget component renders with its options", () => {
	type WidgetOpts = { label: string };
	function TestWidget({ options }: { options: WidgetOpts }) {
		return <span data-testid="test-widget">{options.label}</span>;
	}

	registerBlock<"testWidget", WidgetOpts>({
		kind: "testWidget",
		behavior: "leaf",
		render: TestWidget,
	});

	const node = { kind: "testWidget", options: { label: "hello" } } as never;
	const { getByTestId } = render(renderNode(node));

	expect(getByTestId("test-widget").textContent).toBe("hello");
});
