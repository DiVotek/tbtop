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
interface SubmitCallbacks {
	onBeforeUpdate?: (page: unknown) => void;
	onSuccess?: (page: unknown) => void;
	onFinish?: () => void;
}
let deferSubmit: ((callbacks: SubmitCallbacks) => void) | undefined;

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		post: mock((_path: string, _data: unknown, opts?: SubmitCallbacks) => {
			if (deferSubmit && opts) {
				deferSubmit(opts);
			} else {
				opts?.onSuccess?.({ flash: { "tbtop.effects": responseEffects } });
				opts?.onFinish?.();
			}
		}),
		on: mock(() => () => {}),
		visit: mock(() => {}),
	},
}));

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

function buildForm(email?: string): StructureNode {
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
		data: { forgot: email === undefined ? {} : { email } },
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
	deferSubmit = undefined;
});

describe("form submit: resetForm delivered via flash", () => {
	test("an unchanged empty PHP array record keeps submitted values clean", async () => {
		const response = new Promise<SubmitCallbacks>((resolve) => {
			deferSubmit = resolve;
		});
		const input = await submitTyped("saved@example.com");
		const dirty = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(dirty);
		expect(dirty.defaultPrevented).toBe(true);
		const callbacks = await response;
		const page = {
			url: "/admin/forgot-password",
			props: { data: { forgot: [] } },
		};
		await act(async () => {
			callbacks.onBeforeUpdate?.(page);
			callbacks.onSuccess?.(page);
			callbacks.onFinish?.();
		});
		expect(input.value).toBe("saved@example.com");
		const clean = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(clean);
		expect(clean.defaultPrevented).toBe(false);
	});
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

	test.each([
		true,
		false,
	])("successful submit preserves later edits (record refresh first: %s)", async (refreshFirst) => {
		const Wrap = wrap(() => new Response("{}"));
		const tree = (email = "") => <Wrap>{renderNode(buildForm(email))}</Wrap>;
		const view = render(tree());
		const input = (await view.findByLabelText("Email")) as HTMLInputElement;
		const saved = "saved@example.com";
		const draft = "draft@example.com";
		const success = new Promise<SubmitCallbacks>((resolve) => {
			deferSubmit = resolve;
		});
		const user = userEvent.setup();
		await user.type(input, saved);
		await user.click(view.getByTestId("action-submit"));
		const callbacks = await success;
		await user.clear(input);
		await user.type(input, draft);

		const refresh = async () => {
			await act(async () => view.rerender(tree(saved)));
			expect(input.value).toBe(draft);
		};
		const response = {
			url: "/admin/forgot-password",
			props: { data: { forgot: { email: saved } } },
		};
		callbacks.onBeforeUpdate?.(response);
		if (refreshFirst) {
			await refresh();
		}
		await act(async () => {
			callbacks.onSuccess?.(response);
			callbacks.onFinish?.();
		});
		expect(input.value).toBe(draft);
		if (!refreshFirst) {
			await refresh();
		}
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
