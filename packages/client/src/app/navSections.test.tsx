import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { AdminLayoutShell, type NavigationLayout } from "./AdminLayout";
import type { NavGroup } from "./chromeContext";

const NAV: NavGroup[] = [
	{
		key: "sales",
		group: "Sales",
		sections: [
			{ key: "work", label: "Work" },
			{ key: "reports", label: "Reports" },
		],
		items: [
			{ label: "Inbox", href: "/admin/inbox" },
			{ label: "Board", href: "/admin/board", section: "work" },
			{ label: "My tasks", href: "/admin/tasks", section: "work" },
			{ label: "Funnel", href: "/admin/funnel", section: "reports" },
		],
	},
];

function renderNav(navigation: NavigationLayout) {
	return render(
		<AdminLayoutShell
			nav={NAV}
			user={{ name: "Alice" }}
			currentUrl="/admin"
			navigation={navigation}
		>
			<div />
		</AdminLayoutShell>,
	);
}

function textOrder(root: HTMLElement, texts: string[]): string[] {
	const content = root.textContent ?? "";
	return texts
		.filter((text) => content.includes(text))
		.sort((a, b) => content.indexOf(a) - content.indexOf(b));
}

const EXPECTED = ["Inbox", "Work", "Board", "My tasks", "Reports", "Funnel"];

describe("nav sections", () => {
	test("the sidebar heads each section once, above its own items", () => {
		const { getAllByTestId } = renderNav("sidebar");
		const sidebar = getAllByTestId("admin-sidebar")[0] as HTMLElement;

		expect(textOrder(sidebar, EXPECTED)).toEqual(EXPECTED);
		expect(getAllByTestId("nav-section-sales-work")).toHaveLength(1);
	});

	test("a topbar dropdown labels its sections in the same order", async () => {
		const { getByTestId, findByTestId } = renderNav("topbar");
		const trigger = getByTestId("nav-group-trigger-sales");
		await act(async () => {
			fireEvent.pointerDown(trigger, { bubbles: true, cancelable: true, isPrimary: true });
			fireEvent.click(trigger);
		});
		const menu = await findByTestId("nav-group-menu-sales");

		expect(textOrder(menu, EXPECTED)).toEqual(EXPECTED);
	});
});
