/**
 * M-82: pressing Enter in a DSL form field must submit the form, taking the
 * exact same path the submit button's click takes (router.post to the form
 * endpoint), with pre-flight validation preserved.
 *
 * These drive the REAL submit path: author wire JSON → materialize() (which
 * turns a `spec:{type:"submit"}` action into the submit handler + the isSubmit
 * flag) → renderNode() → fire a native form submit / keydown. The assertion
 * target is router.post — the call the submitHandler makes.
 *
 * router is mocked here (not in formBlock.test.tsx) because mock.module is
 * process-global; isolating it keeps the handler-based formBlock tests clean.
 */
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
