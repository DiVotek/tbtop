import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { AdminLayoutShell } from "./AdminLayout";

const USER = { name: "Alice Smith", email: "alice@example.com" };
const NAV = [{ group: "Content", items: [{ label: "Posts", href: "/admin/posts" }] }];

function renderTopbarSidebar() {
	return render(
		<AdminLayoutShell
			nav={NAV}
			user={USER}
			currentUrl="/admin/posts"
			navigation="topbar-sidebar"
		>
			<div data-testid="page">Content</div>
		</AdminLayoutShell>,
	);
}

// The mobile drawer mirrors the sidebar tree, so brand/nav appear twice in
// jsdom (no CSS to hide `lg:hidden`). Assert on presence, not exact count.
describe("TopbarSidebarFrame", () => {
	test("renders the brand and sidebar collapse toggle in the bar", () => {
		const { getByTestId, getAllByText } = renderTopbarSidebar();
		expect(getAllByText("Tabletop").length).toBeGreaterThan(0);
		expect(getByTestId("sidebar-collapse")).toBeTruthy();
	});

	test("shows the sidebar nav by default", () => {
		const { getAllByTestId } = renderTopbarSidebar();
		expect(getAllByTestId("admin-sidebar").length).toBeGreaterThan(0);
	});

	test("collapse toggle switches the desktop sidebar to an icon rail", () => {
		const { getByTestId, queryAllByTestId } = renderTopbarSidebar();
		// Expanded: the group renders as a full section, no rail trigger.
		expect(queryAllByTestId("nav-group-trigger-Content").length).toBe(0);
		fireEvent.click(getByTestId("sidebar-collapse"));
		// Collapsed: the desktop aside becomes a rail of group-icon triggers.
		expect(queryAllByTestId("nav-group-trigger-Content").length).toBeGreaterThan(0);
	});
});
