// A blur-triggered error line under a field must not move the Save button
// between pointerdown and click: the click would land beside it and be lost.
import { afterEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { registerFields } from "../render/registerFields";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

const posted: Record<string, unknown>[] = [];

// The form schema is compiled from constraints only once field kinds are registered.
registerFields();

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		post: mock(
			(
				_path: string,
				data: Record<string, unknown>,
				opts?: { onSuccess?: (page: unknown) => void },
			) => {
				posted.push(data);
				opts?.onSuccess?.({ flash: {} });
			},
		),
		on: mock(() => () => {}),
		visit: mock(() => {}),
	},
}));

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

async function renderForm(title: string) {
	const raw = node(
		"form",
		{
			name: "post",
			children: [
				node(
					"text",
					{ label: "Title", required: true, constraints: { required: true } },
					"title",
				),
				node("action", { label: "Save", spec: { type: "submit" } }, "save"),
			],
		},
		"post",
	);
	const formNode = materialize(raw, { basePath: "/admin/posts", data: { post: { title } } });
	const Wrap = wrap(() => new Response("{}"));
	const view = render(<Wrap>{renderNode(formNode)}</Wrap>);
	await view.findByTestId("action-save");
	return view;
}

/** A real press: mousedown moves focus (the field blurs), the release clicks. */
async function pressSave(view: Awaited<ReturnType<typeof renderForm>>) {
	const user = userEvent.setup();
	const save = view.getByTestId("action-save");
	await user.pointer({ keys: "[MouseLeft>]", target: save });
	const errorWhilePressed = view.queryByTestId("field-error-title") !== null;
	await user.pointer({ keys: "[/MouseLeft]", target: save });
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
	return errorWhilePressed;
}

async function typeTitle(view: Awaited<ReturnType<typeof renderForm>>, value: string) {
	const user = userEvent.setup();
	const input = view.getByLabelText(/Title/);
	await user.clear(input);
	// clear() alone leaves React's controlled value stale; a keystroke syncs it.
	await user.type(input, value === "" ? "x{Backspace}" : value);
}

afterEach(() => {
	posted.length = 0;
});

describe("blur validation during a press on an action", () => {
	test("emptying a required field: no error appears until the click has run", async () => {
		const view = await renderForm("Hello");
		await typeTitle(view, "");
		expect(await pressSave(view)).toBe(false);
		expect(view.queryByTestId("field-error-title")).not.toBeNull();
		expect(posted).toEqual([]);
	});

	test("fixing an invalid field: the error stays put and the click submits", async () => {
		const view = await renderForm("Hello");
		await typeTitle(view, "");
		await userEvent.setup().tab();
		expect(view.queryByTestId("field-error-title")).not.toBeNull();

		await typeTitle(view, "Fixed");
		expect(await pressSave(view)).toBe(true);
		expect(posted).toEqual([{ title: "Fixed" }]);
	});

	test("a blur without a press still shows the error at once", async () => {
		const view = await renderForm("Hello");
		await typeTitle(view, "");
		await userEvent.setup().tab();
		expect(view.queryByTestId("field-error-title")).not.toBeNull();
	});
});
