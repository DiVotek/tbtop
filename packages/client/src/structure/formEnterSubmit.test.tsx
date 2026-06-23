// M-82: Enter in a DSL form must submit via the real path (materialize →
// render → router.post). router is mocked in its own file because mock.module
// is process-global and would leak into formBlock.test.tsx's handler tests.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, fireEvent, render } from "@testing-library/react";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

interface PostCall {
	path: string;
	data: Record<string, unknown>;
}

const postCalls: PostCall[] = [];

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		post: mock(
			(path: string, data: Record<string, unknown>, opts?: { onSuccess?: () => void }) => {
				postCalls.push({ path, data });
				opts?.onSuccess?.();
			},
		),
		on: mock(() => () => {}),
		visit: mock(() => {}),
	},
}));

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

const BASE = { basePath: "/admin/posts", data: { post: { title: "Hello" } } };

function buildForm(actions: StructureNode[]): StructureNode {
	const raw = node(
		"form",
		{ name: "post", children: [node("text", { label: "Title" }, "title"), ...actions] },
		"post",
	);
	return materialize(raw, BASE);
}

beforeEach(() => {
	postCalls.length = 0;
});

afterEach(() => {
	postCalls.length = 0;
});

describe("Form Enter-to-submit", () => {
	test("display-only form (no submit action) does not post on Enter", async () => {
		const formNode = buildForm([]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const form = await findByTestId("form-block");
		await act(async () => {
			fireEvent.submit(form);
		});
		expect(postCalls.length).toBe(0);
	});

	test("a non-submit (visit) button does not post when clicked", async () => {
		const formNode = buildForm([
			node("action", { label: "Back", spec: { type: "visit", href: "/admin" } }, "back"),
			node("action", { label: "Save", spec: { type: "submit" } }, "save"),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const back = await findByTestId("action-back");
		await act(async () => {
			fireEvent.click(back);
		});
		expect(postCalls.length).toBe(0);
	});

	test("Enter in a text field posts to the form endpoint once with form data", async () => {
		const formNode = buildForm([
			node("action", { label: "Save", spec: { type: "submit" } }, "save"),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const form = await findByTestId("form-block");
		await act(async () => {
			fireEvent.submit(form);
		});
		expect(postCalls.length).toBe(1);
		expect(postCalls[0]?.path).toBe("/admin/posts/forms/post");
		expect(postCalls[0]?.data).toEqual({ title: "Hello" });
	});

	test("submit serializes upload preview objects to stored path strings", async () => {
		const raw = node(
			"form",
			{
				name: "post",
				children: [
					node("section", { children: [node("upload", { label: "Cover" }, "cover")] }),
					node("action", { label: "Save", spec: { type: "submit" } }, "save"),
				],
			},
			"post",
		);
		const formNode = materialize(raw, {
			basePath: "/admin/posts",
			data: { post: { cover: { path: "uploads/a.png", url: "/storage/uploads/a.png" } } },
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const form = await findByTestId("form-block");

		await act(async () => {
			fireEvent.submit(form);
		});

		expect(postCalls[0]?.data).toEqual({ cover: "uploads/a.png" });
	});

	test("submit serializes upload preview objects inside repeater rows", async () => {
		const raw = node(
			"form",
			{
				name: "post",
				children: [
					node(
						"repeater",
						{ fields: [node("upload", { label: "Attachment" }, "file")] },
						"sections",
					),
					node("action", { label: "Save", spec: { type: "submit" } }, "save"),
				],
			},
			"post",
		);
		const formNode = materialize(raw, {
			basePath: "/admin/posts",
			data: {
				post: {
					sections: [{ file: { path: "uploads/a.png", url: "/storage/uploads/a.png" } }],
				},
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const form = await findByTestId("form-block");

		await act(async () => {
			fireEvent.submit(form);
		});

		expect(postCalls[0]?.data).toEqual({ sections: [{ file: "uploads/a.png" }] });
	});

	test("submit serializes translatable upload preview objects per locale", async () => {
		const raw = node(
			"form",
			{
				name: "post",
				children: [
					node("upload", { label: "Cover", translatable: true }, "cover"),
					node("action", { label: "Save", spec: { type: "submit" } }, "save"),
				],
			},
			"post",
		);
		const formNode = materialize(raw, {
			basePath: "/admin/posts",
			data: {
				post: {
					cover: {
						en: { path: "uploads/en.png", url: "/storage/uploads/en.png" },
						uk: { path: "uploads/uk.png", url: "/storage/uploads/uk.png" },
					},
				},
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		const form = await findByTestId("form-block");

		await act(async () => {
			fireEvent.submit(form);
		});

		expect(postCalls[0]?.data).toEqual({
			cover: { en: "uploads/en.png", uk: "uploads/uk.png" },
		});
	});

	test("submit keybinding and Enter both reach submit, independent of other bindings", async () => {
		const formNode = buildForm([
			node(
				"action",
				{ label: "Reload", spec: { type: "server", needs: [] }, keybinding: "r" },
				"reload",
			),
			node(
				"action",
				{ label: "Save", spec: { type: "submit" }, keybinding: "mod+s" },
				"save",
			),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(formNode)}</Wrap>);
		await findByTestId("action-save");

		// Enter (native form submit) → one post.
		const form = await findByTestId("form-block");
		await act(async () => {
			fireEvent.submit(form);
		});
		expect(postCalls.length).toBe(1);

		// cmd/ctrl+s keybinding → another post via the same submit path.
		await act(async () => {
			fireEvent.keyDown(window, { key: "s", metaKey: true });
		});
		expect(postCalls.length).toBe(2);

		// A different button's keybinding must NOT reach the submit endpoint.
		await act(async () => {
			fireEvent.keyDown(window, { key: "r" });
		});
		expect(postCalls.length).toBe(2);
	});
});
