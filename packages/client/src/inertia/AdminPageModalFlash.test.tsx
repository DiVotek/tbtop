/**
 * A submit() inside a DSL modal whose server handler returns
 * notify()->closeModal()->redirect(sameUrl) arrives as Inertia flash on a
 * fresh page load. closeModal must close the modal the submit came from (the
 * topmost open one) and the redirect must still run, in the order sent.
 *
 * Mocks ONLY usePage + router from @inertiajs/react (bun mock.module is
 * process-global; spreading the real module keeps Link intact).
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, render, waitFor } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import type { StructureNode } from "../structure/types";
import type { ServerEffect } from "./effects";

let currentFlash: Record<string, unknown> = {};
const routerVisit = mock((_href: string, _options?: Record<string, unknown>) => {});

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: PAGE_PROPS, url: "/admin/customers/1", flash: currentFlash }),
	router: { visit: routerVisit, post: mock(() => {}), on: mock(() => () => {}) },
	Head: () => null,
}));

import { AdminPage } from "./AdminPage";

function modalAction(name: string, title: string, extra?: StructureNode): StructureNode {
	const text: StructureNode = {
		kind: "displayText",
		meta: {},
		options: { content: `${title} body` },
	};
	return {
		kind: "action",
		meta: {},
		options: {
			name,
			label: title,
			modal: {
				type: "modal",
				title,
				body: {
					kind: "stack",
					meta: {},
					options: { children: extra ? [text, extra] : [text] },
				},
			},
		},
	};
}

const PAGE_PROPS = {
	slug: "customers-edit",
	title: "Customer",
	structure: {
		kind: "stack",
		meta: {},
		options: {
			children: [modalAction("outer", "Outer modal", modalAction("inner", "Inner modal"))],
		},
	},
	data: {},
};

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
	currentFlash = {};
	routerVisit.mockClear();
});

afterEach(() => {
	clearBlockRegistry();
});

function flashEffects(rerender: (ui: React.ReactElement) => void, effects: ServerEffect[]) {
	currentFlash = { "tbtop.effects": effects };
	act(() => rerender(<AdminPage />));
}

describe("AdminPage: closeModal via Inertia flash", () => {
	test("closes the open modal and still runs the redirect", async () => {
		const { getByTestId, queryByText, rerender } = render(<AdminPage />);
		act(() => getByTestId("action-outer").click());
		await waitFor(() => expect(queryByText("Outer modal body")).not.toBeNull());

		flashEffects(rerender, [
			{ kind: "notify", message: "Saved" },
			{ kind: "closeModal" },
			{ kind: "redirect", href: "/admin/customers/1" },
		]);

		await waitFor(() => expect(queryByText("Outer modal body")).toBeNull());
		expect(routerVisit).toHaveBeenCalledTimes(1);
		expect(routerVisit.mock.calls[0]?.[0]).toBe("/admin/customers/1");
	});

	test("with two open modals closes only the topmost one", async () => {
		const { getByTestId, queryByText, rerender } = render(<AdminPage />);
		act(() => getByTestId("action-outer").click());
		await waitFor(() => expect(queryByText("Outer modal body")).not.toBeNull());
		act(() => getByTestId("action-inner").click());
		await waitFor(() => expect(queryByText("Inner modal body")).not.toBeNull());

		flashEffects(rerender, [{ kind: "closeModal" }]);

		await waitFor(() => expect(queryByText("Inner modal body")).toBeNull());
		expect(queryByText("Outer modal body")).not.toBeNull();
	});
});
