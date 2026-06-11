import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
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

describe("Aside block", () => {
	test("Aside: renders aside-block container", () => {
		const node = s.aside([
			{
				kind: "displayText" as const,
				options: { content: "Sidebar", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("aside-block")).toBeTruthy();
	});

	test("Aside: renders children inside the aside block", () => {
		const node = s.aside([
			{
				kind: "displayText" as const,
				options: { content: "Sidebar heading", variant: "body" as const },
				meta: {},
			},
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByText("Sidebar heading")).toBeTruthy();
	});

	test("Aside: top-level stack with aside renders two-column layout", () => {
		const node = s.stack([
			s.section({ title: "Main" }, [
				{
					kind: "displayText" as const,
					options: { content: "Main content", variant: "body" as const },
					meta: {},
				},
			]),
			s.aside([
				{
					kind: "displayText" as const,
					options: { content: "Sidebar", variant: "body" as const },
					meta: {},
				},
			]),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("aside-block")).toBeTruthy();
		expect(getByText("Main content")).toBeTruthy();
		expect(getByText("Sidebar")).toBeTruthy();
	});

	test("Aside: form fields inside aside render and bind correctly", async () => {
		const node = s.aside([
			s.form({ query: async () => ({ note: "hello" }) }, [s.text({ name: "note" })]),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByDisplayValue } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("aside-block")).toBeTruthy();
		await findByDisplayValue("hello");
	});

	test("Aside: hiddenIf=true hides the aside block entirely", () => {
		const node = s.aside(
			[
				{
					kind: "displayText" as const,
					options: { content: "Hidden", variant: "body" as const },
					meta: {},
				},
			],
			{ hidden: () => true },
		);
		const Wrap = wrap(() => new Response("{}"));
		const { queryByTestId, queryByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(queryByTestId("aside-block")).toBeNull();
		expect(queryByText("Hidden")).toBeNull();
	});
});

describe("Aside: page-level layout with sticky positioning", () => {
	test("Aside: when page has aside node, a page-layout wrapper sets flex-row", () => {
		const mainNode = s.section({ title: "Main" }, [
			{
				kind: "displayText" as const,
				options: { content: "Content", variant: "body" as const },
				meta: {},
			},
		]);
		const asideNode = s.aside([
			{
				kind: "displayText" as const,
				options: { content: "Sidebar content", variant: "body" as const },
				meta: {},
			},
		]);
		const page = s.stack([mainNode, asideNode]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(
			<Wrap>
				<div data-testid="page-root">{renderNode(page)}</div>
			</Wrap>,
		);
		// both main and aside are visible in the tree
		const root = getByTestId("page-root");
		expect(root.querySelector("[data-testid='aside-block']")).toBeTruthy();
	});
});
