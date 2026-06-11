import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("Collapsible block", () => {
	test("Collapsible: renders label and children visible when collapsed=false (default)", () => {
		const node = s.collapsible({ label: "Advanced" }, [
			{
				kind: "displayText" as const,
				options: { content: "Inside", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByText("Advanced")).toBeTruthy();
		expect(getByText("Inside")).toBeTruthy();
	});

	test("Collapsible: collapsed=true hides children initially", () => {
		const node = s.collapsible({ label: "Advanced", collapsed: true }, [
			{
				kind: "displayText" as const,
				options: { content: "Hidden initially", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByText, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByText("Advanced")).toBeTruthy();
		expect(queryByText("Hidden initially")).toBeNull();
	});

	test("Collapsible: clicking toggle button expands a collapsed section", async () => {
		const node = s.collapsible({ label: "Show more", collapsed: true }, [
			{
				kind: "displayText" as const,
				options: { content: "Now visible", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByText, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(queryByText("Now visible")).toBeNull();
		await act(async () => {
			fireEvent.click(getByTestId("collapsible-toggle"));
		});
		await findByText("Now visible");
	});

	test("Collapsible: clicking toggle again collapses an open section", async () => {
		const node = s.collapsible({ label: "Collapse me" }, [
			{
				kind: "displayText" as const,
				options: { content: "Will disappear", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		// starts open
		expect(queryByText("Will disappear")).toBeTruthy();
		// close
		await act(async () => {
			fireEvent.click(getByTestId("collapsible-toggle"));
		});
		expect(queryByText("Will disappear")).toBeNull();
	});

	test("Collapsible: hiddenIf=true hides the entire block including label", () => {
		const node = s.collapsible({ label: "Hidden section", hidden: () => true }, [
			{
				kind: "displayText" as const,
				options: { content: "Inner", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(queryByText("Hidden section")).toBeNull();
		expect(queryByText("Inner")).toBeNull();
	});
});
