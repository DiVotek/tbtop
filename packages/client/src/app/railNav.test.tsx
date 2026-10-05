import { beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { AdminLayoutShell } from "./AdminLayout";
import type { NavGroup } from "./chromeContext";
import { resolveActiveGroup } from "./navRail";

const NAV: NavGroup[] = [
	{ key: "", group: null, items: [{ label: "Dashboard", href: "/app" }] },
	{
		key: "sales",
		group: "Sales",
		description: "Deals and daily work",
		icon: { name: "funnel", position: "left" },
		items: [
			{ label: "Board", href: "/app/board", badge: "46" },
			{ label: "My tasks", href: "/app/tasks" },
		],
	},
	{
		key: "orders",
		group: "Orders",
		items: [
			{ label: "Docs", href: "https://example.test/docs", newTab: true },
			{ label: "All orders", href: "/app/orders" },
		],
	},
	{
		key: "links",
		group: "Links",
		items: [{ label: "Site", href: "https://example.test", newTab: true }],
	},
];

function renderRail(currentUrl: string, pageNavGroup?: string) {
	return render(
		<AdminLayoutShell
			nav={NAV}
			user={{ name: "Alice" }}
			currentUrl={currentUrl}
			navigation="rail-sidebar"
			pageNavGroup={pageNavGroup}
			panelId="sales"
		>
			<div />
		</AdminLayoutShell>,
	);
}

beforeEach(() => window.localStorage.clear());

describe("rail-sidebar shell", () => {
	test("the sidebar lists only the active group, whose rail icon is current", () => {
		const { getByTestId } = renderRail("/app/tasks");

		const panel = getByTestId("nav-active-group");
		expect(panel.textContent).toContain("Board");
		expect(panel.textContent).not.toContain("All orders");
		expect(getByTestId("nav-rail-sales").getAttribute("aria-current")).toBe("true");
		expect(getByTestId("nav-rail-orders").getAttribute("aria-current")).toBeNull();
	});

	test("every rail entry names its group in text under the icon, Home included", () => {
		const { getByTestId, getByRole } = renderRail("/app/board");

		expect(getByTestId("nav-rail-sales").textContent).toBe("Sales");
		expect(getByTestId("nav-rail-home").textContent).toBe("Home");
		expect(getByRole("link", { name: "Orders" }).getAttribute("href")).toBe("/app/orders");
	});

	test("the column shows the active group's description under its title", () => {
		const { getByTestId } = renderRail("/app/tasks");

		expect(getByTestId("nav-active-group").textContent).toStartWith(
			"SalesDeals and daily work",
		);
	});

	test("a rail icon opens its group's first internal, same-tab item", () => {
		const { getByTestId, queryByTestId } = renderRail("/app/board");

		expect(getByTestId("nav-rail-orders").getAttribute("href")).toBe("/app/orders");
		expect(getByTestId("nav-rail-home").getAttribute("href")).toBe("/app");
		expect(queryByTestId("nav-rail-links")).toBeNull();
	});

	test("the mobile drawer swaps groups in place and reopens on the page's group", () => {
		const { getByTestId, getAllByTestId } = renderRail("/app/board");
		fireEvent.click(getByTestId("sidebar-trigger"));
		const drawerList = () => getAllByTestId("nav-active-group").at(-1) as HTMLElement;

		fireEvent.click(getByTestId("nav-drawer-group-orders"));

		expect(within(drawerList()).queryByText("All orders")).toBeTruthy();
		expect(within(drawerList()).queryByText("Board")).toBeNull();
		expect(getByTestId("nav-drawer-group-orders").getAttribute("aria-pressed")).toBe("true");

		fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
		fireEvent.click(getByTestId("sidebar-trigger"));

		expect(getByTestId("nav-drawer-group-sales").getAttribute("aria-pressed")).toBe("true");
	});
});

describe("resolveActiveGroup", () => {
	const resolve = (currentUrl: string, pageGroup?: string, remembered?: string) =>
		resolveActiveGroup({ nav: NAV, currentUrl, pageGroup, remembered });

	test("the longest matching href wins over a root item that prefixes every URL", () => {
		expect(resolve("/app/orders/2184")).toEqual({ key: "orders", source: "url" });
	});

	test("falls back to the page's own group, then the remembered one, then the first entry", () => {
		const unmatched = "/elsewhere/7";
		expect(resolve(unmatched, "orders", "sales")).toEqual({ key: "orders", source: "page" });
		expect(resolve(unmatched, undefined, "sales")).toEqual({
			key: "sales",
			source: "remembered",
		});
		expect(resolve(unmatched)).toEqual({ key: "", source: "first" });
	});

	test("skips a page or remembered group that has no rail entry", () => {
		expect(resolve("/elsewhere", "links", "gone")).toEqual({ key: "", source: "first" });
	});
});
