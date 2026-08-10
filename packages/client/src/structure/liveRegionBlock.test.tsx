import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import type { FetchHandler } from "../testFixtures";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

ensureBuiltinsRegistered();

function displayText(content: string): StructureNode {
	return { kind: "displayText", options: { content, variant: "muted" }, meta: {} };
}

function pageStructure(): StructureNode {
	return {
		kind: "form",
		name: "post",
		options: {
			name: "post",
			children: [
				{ kind: "text", name: "title", options: { label: "Title" }, meta: {} },
				{
					kind: "liveRegion",
					name: "preview",
					options: { dependsOn: ["title"], initial: [displayText("Initial: Hello")] },
					meta: {},
				},
			],
		},
		meta: {},
	} as StructureNode;
}

interface RegionCall {
	url: string;
	deps: Record<string, string>;
}

function regionHandler(calls: RegionCall[]): FetchHandler {
	return async (req) => {
		const body = (await req.json()) as { deps: Record<string, string> };
		calls.push({ url: req.url, deps: body.deps });
		const label = body.deps.title === undefined ? "empty" : body.deps.title;
		return Response.json({ nodes: [displayText(`Fresh: ${label}`)] });
	};
}

function mountPage(calls: RegionCall[]) {
	const materialized = materialize(pageStructure(), {
		basePath: "/admin/posts",
		data: { post: { title: "Hello" } },
	});
	const Wrap = wrap(regionHandler(calls));
	return render(<Wrap>{renderNode(materialized)}</Wrap>);
}

describe("LiveRegion integration", () => {
	test("initial content renders from the wire without any fetch", async () => {
		const calls: RegionCall[] = [];
		const { findByText } = mountPage(calls);

		expect(await findByText("Initial: Hello")).toBeTruthy();
		expect(calls.length).toBe(0);
	});

	test("changing a watched field posts deps to the region endpoint and swaps content", async () => {
		const user = userEvent.setup();
		const calls: RegionCall[] = [];
		const { getByLabelText, findByText, queryByText } = mountPage(calls);
		await findByText("Initial: Hello");

		// user.clear does not reach React's onChange in this DOM — drive the
		// value with keystrokes, which do.
		const input = getByLabelText("Title");
		await user.type(input, "{backspace}{backspace}{backspace}{backspace}{backspace}World");

		expect(await findByText("Fresh: World")).toBeTruthy();
		expect(queryByText("Initial: Hello")).toBeNull();
		const last = calls.at(-1);
		expect(last?.url).toContain("/admin/posts/live-region/preview");
		expect(last?.deps).toEqual({ title: "World" });
	});

	test("clearing the watched field still reloads — empty deps are a legitimate state", async () => {
		const user = userEvent.setup();
		const calls: RegionCall[] = [];
		const { getByLabelText, findByText } = mountPage(calls);
		await findByText("Initial: Hello");

		await user.type(
			getByLabelText("Title"),
			"{backspace}{backspace}{backspace}{backspace}{backspace}",
		);

		expect(await findByText("Fresh: empty")).toBeTruthy();
		await waitFor(() => expect(calls.at(-1)?.deps).toEqual({}));
	});
});
