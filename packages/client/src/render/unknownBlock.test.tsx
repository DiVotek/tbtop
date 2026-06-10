import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { render } from "@testing-library/react";
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

test("UnknownBlock: unregistered kind renders fallback box without crashing", () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		const node = { kind: "custom-unregistered-xyz" } as never;
		const { getByTestId } = render(renderNode(node));

		expect(getByTestId("unknown-block")).toBeTruthy();
		expect(getByTestId("unknown-block").textContent).toContain("custom-unregistered-xyz");
	} finally {
		warn.mockRestore();
	}
});

test("UnknownBlock: console.warn fires once per kind across multiple renders", () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		const node = { kind: "custom-unregistered-xyz" } as never;
		render(renderNode(node));
		render(renderNode(node));
		render(renderNode(node));

		expect(warn).toHaveBeenCalledTimes(1);
	} finally {
		warn.mockRestore();
	}
});
