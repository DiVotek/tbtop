// A form-submit handler's effects arrive as Inertia flash, which has no form
// to act on — so resetForm must be applied by the submit itself, from the
// response page's flash. router is mocked in its own file: mock.module is
// process-global.
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import type { ServerEffect } from "./effects";
import { executeFlashEffects } from "./flashEffects";
import { materialize } from "./materialize";

let responseEffects: ServerEffect[] = [];

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		post: mock(
			(_path: string, _data: unknown, opts?: { onSuccess?: (page: unknown) => void }) => {
				opts?.onSuccess?.({ flash: { "tbtop.effects": responseEffects } });
			},
		),
		on: mock(() => () => {}),
		visit: mock(() => {}),
	},
}));

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

function buildForm(): StructureNode {
	const raw = node(
		"form",
		{
			name: "forgot",
			children: [
				node("text", { label: "Email" }, "email"),
				node("action", { label: "Send", spec: { type: "submit" } }, "submit"),
			],
		},
		"forgot",
	);
	return materialize(raw, {
		basePath: "/admin/forgot-password",
		data: { forgot: { email: "" } },
	});
}

async function submitTyped(value: string): Promise<HTMLInputElement> {
	const Wrap = wrap(() => new Response("{}"));
	const { getByLabelText, findByTestId } = render(<Wrap>{renderNode(buildForm())}</Wrap>);
	await waitFor(() => getByLabelText("Email"));
	const input = getByLabelText("Email") as HTMLInputElement;
	await userEvent.setup().type(input, value);
	expect(input.value).toBe(value);
	const form = await findByTestId("form-block");
	await act(async () => {
		fireEvent.submit(form);
	});
	return input;
}

afterEach(() => {
	responseEffects = [];
});

describe("form submit: resetForm delivered via flash", () => {
	test("resetForm returns the form to its record", async () => {
		responseEffects = [{ kind: "notify", message: "Sent" }, { kind: "resetForm" }];
		const input = await submitTyped("someone@example.com");
		await waitFor(() => expect(input.value).toBe(""));
	});

	test("without resetForm the submitted values stay", async () => {
		responseEffects = [{ kind: "notify", message: "Saved" }];
		const input = await submitTyped("someone@example.com");
		expect(input.value).toBe("someone@example.com");
	});

	test("the page-level flash dispatch skips resetForm without a warning", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		executeFlashEffects([{ kind: "resetForm" }], {
			notify: mock(() => {}),
			modals: { push: () => () => {}, closeTop: () => false },
		});
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
