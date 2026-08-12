import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { NavGroup } from "../chromeContext";
import { CommandPalette } from "./CommandPalette";

// spyOn(router, "visit") breaks once any other file has mock.module'd
// @inertiajs/react — that replacement is process-global and makes visit an
// accessor property, which bun cannot spy on. Since file order is random,
// so was the failure. Own the module here instead, mirroring effects.test.ts.
const routerVisit = mock((_href: string) => {});
mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: { visit: routerVisit, post: mock(() => {}), on: mock(() => () => {}) },
}));

const NAV: NavGroup[] = [
	{ key: "Overview", group: "Overview", items: [{ label: "Dashboard", href: "/admin" }] },
	{
		key: "Content",
		group: "Content",
		items: [
			{ label: "Posts", href: "/admin/posts" },
			{ label: "Brands", href: "/admin/brands" },
		],
	},
];

function openPalette() {
	act(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
	});
}

afterEach(cleanup);

beforeEach(() => {
	routerVisit.mockClear();
});

describe("CommandPalette", () => {
	test("the hotkey opens the palette and lists nav destinations", () => {
		const { queryByTestId, getByTestId, getByText } = render(
			<CommandPalette nav={NAV} data={{ hotkey: "mod+k" }} />,
		);
		expect(queryByTestId("command-palette-input")).toBeNull();
		openPalette();
		expect(getByTestId("command-palette-input")).toBeTruthy();
		expect(getByText("Posts")).toBeTruthy();
	});

	test("arrow keys move the selection and Enter runs it", () => {
		const { getByTestId } = render(<CommandPalette nav={NAV} data={{ hotkey: "mod+k" }} />);
		openPalette();
		const input = getByTestId("command-palette-input");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(routerVisit).toHaveBeenCalledWith("/admin/posts");
	});

	test("closing without selecting resets the highlight for the next open", () => {
		const { getByTestId, getByText, queryByTestId } = render(
			<CommandPalette nav={NAV} data={{ hotkey: "mod+k" }} />,
		);
		openPalette();
		const input = getByTestId("command-palette-input");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		act(() => {
			fireEvent.keyDown(document, { key: "Escape" });
		});
		expect(queryByTestId("command-palette-input")).toBeNull();
		openPalette();
		expect(getByText("Dashboard").closest("button")?.className).toContain("bg-accent");
	});

	test("a commands-only palette omits nav destinations", () => {
		const { getByText, queryByText } = render(
			<CommandPalette
				nav={NAV}
				data={{
					hotkey: "mod+k",
					includeNav: false,
					commands: [{ label: "Docs", href: "/docs" }],
				}}
			/>,
		);
		openPalette();
		expect(queryByText("Dashboard")).toBeNull();
		expect(getByText("Docs")).toBeTruthy();
	});
});
