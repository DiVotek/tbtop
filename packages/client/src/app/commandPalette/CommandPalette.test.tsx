import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { router } from "@inertiajs/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { NavGroup } from "../chromeContext";
import { CommandPalette } from "./CommandPalette";

const NAV: NavGroup[] = [
	{ group: "Overview", items: [{ label: "Dashboard", href: "/admin" }] },
	{
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
		const visit = spyOn(router, "visit").mockImplementation(() => {});
		const { getByTestId } = render(<CommandPalette nav={NAV} data={{ hotkey: "mod+k" }} />);
		openPalette();
		const input = getByTestId("command-palette-input");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(visit).toHaveBeenCalledWith("/admin/posts");
		visit.mockRestore();
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
