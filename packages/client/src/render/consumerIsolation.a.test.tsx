import { afterEach, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { clearBlockRegistry, registerBlock } from "../index";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

// The block registry is a module singleton shared across test files. This file
// registers a custom kind and resets via the public clearBlockRegistry;
// consumerIsolation.b.test.tsx asserts the registration did not leak to it.
afterEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

test("ConsumerIsolation: a custom block registered in this file renders", () => {
	registerBlock<"consumerIsolationWidget", Record<string, never>>({
		kind: "consumerIsolationWidget",
		behavior: "leaf",
		render: () => <span data-testid="isolation-widget">from-a</span>,
	});

	const node = { kind: "consumerIsolationWidget", options: {} } as never;
	const { getByTestId } = render(renderNode(node));

	expect(getByTestId("isolation-widget").textContent).toBe("from-a");
});
