import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { AdminLayoutShell } from "./AdminLayout";
import type { NavGroup } from "./chromeContext";

const USER = { name: "Alice", email: "alice@example.com" };

const NAV: NavGroup[] = [
	{
		key: "Overview",
		group: "Overview",
		icon: { name: "star", position: "left" },
		items: [{ label: "Dashboard", href: "/admin/dashboard" }],
	},
	{
		key: "Content",
		group: "Content",
		items: [
			{
				label: "Iconic",
				href: "/admin/iconic",
				icon: { name: "file-text", position: "left" },
				badge: "3",
				badgeColor: "danger",
			},
		],
	},
];

function renderTopbarNav(currentUrl = "/admin") {
	return render(
		<AdminLayoutShell nav={NAV} user={USER} currentUrl={currentUrl} navigation="topbar">
			<div />
		</AdminLayoutShell>,
	);
}

// Radix DropdownMenu opens on pointerdown; fire both to simulate a real click.
async function openGroup(trigger: HTMLElement) {
	await act(async () => {
		fireEvent.pointerDown(trigger, { bubbles: true, cancelable: true, isPrimary: true });
		fireEvent.click(trigger);
	});
}

describe("NavGroupDropdown (topbar)", () => {
	test("a group becomes a trigger button carrying its group icon", () => {
		const { getByTestId } = renderTopbarNav();
		expect(getByTestId("nav-group-trigger-Overview").querySelector("svg")).toBeTruthy();
	});

	test("group items stay hidden until the dropdown is opened", () => {
		const { queryByText } = renderTopbarNav();
		expect(queryByText("Iconic")).toBeNull();
	});

	test("opening a group reveals item links with their icon and color-mapped badge", async () => {
		const { getByTestId, findByText } = renderTopbarNav();
		await openGroup(getByTestId("nav-group-trigger-Content"));

		expect((await findByText("Iconic")).closest("a")?.querySelector("svg")).toBeTruthy();

		const badge = getByTestId("nav-badge");
		expect(badge.textContent).toBe("3");
		// badgeColor "danger" resolves through the shared color registry.
		expect(badge.className).toContain("bg-destructive");
	});

	test("the trigger for the group holding the current page is highlighted", () => {
		const { getByTestId } = renderTopbarNav("/admin/iconic");

		expect(getByTestId("nav-group-trigger-Content").className).toContain("font-medium");
		expect(getByTestId("nav-group-trigger-Overview").className).not.toContain("font-medium");
	});

	test("the trigger highlights when a nested child is active even if its URL is not a sub-path of the parent", () => {
		const nestedNav: NavGroup[] = [
			{
				key: "System",
				group: "System",
				items: [
					{
						label: "Settings",
						href: "/admin/settings",
						children: [{ label: "Mail config", href: "/admin/mail-config" }],
					},
				],
			},
		];
		const { getByTestId } = render(
			<AdminLayoutShell
				nav={nestedNav}
				user={USER}
				currentUrl="/admin/mail-config"
				navigation="topbar"
			>
				<div />
			</AdminLayoutShell>,
		);

		expect(getByTestId("nav-group-trigger-System").className).toContain("font-medium");
	});

	test("a nav item with children renders as a submenu trigger, not a direct link", async () => {
		const nestedNav: NavGroup[] = [
			{
				key: "System",
				group: "System",
				items: [
					{
						label: "Settings",
						href: "/admin/settings",
						children: [{ label: "General", href: "/admin/settings/general" }],
					},
				],
			},
		];
		const { getByTestId } = render(
			<AdminLayoutShell nav={nestedNav} user={USER} currentUrl="/admin" navigation="topbar">
				<div />
			</AdminLayoutShell>,
		);
		await openGroup(getByTestId("nav-group-trigger-System"));

		const subtrigger = getByTestId("nav-group-subtrigger-/admin/settings");
		expect(subtrigger.textContent).toBe("Settings");
		expect(subtrigger.tagName).not.toBe("A");
	});
});

describe("NavGroupDropdown (rail)", () => {
	function renderRail(currentUrl = "/admin") {
		const shell = render(
			<AdminLayoutShell
				nav={NAV}
				user={USER}
				currentUrl={currentUrl}
				navigation="topbar-sidebar"
			>
				<div />
			</AdminLayoutShell>,
		);
		fireEvent.click(shell.getByTestId("sidebar-collapse"));
		return shell;
	}

	test("the rail trigger shows only the group icon, not its label text", () => {
		const { getByTestId } = renderRail();
		const trigger = getByTestId("nav-group-trigger-Overview");
		expect(trigger.querySelector("svg")).toBeTruthy();
		expect(trigger.textContent).toBe("");
		expect(trigger.getAttribute("aria-label")).toBe("Overview");
	});

	test("opening a rail group reveals its items in a right-side menu", async () => {
		const { getByTestId, findByText } = renderRail();
		await openGroup(getByTestId("nav-group-trigger-Content"));
		expect(await findByText("Iconic")).toBeTruthy();
	});

	test("the rail trigger for the group holding the current page is highlighted", () => {
		const { getByTestId } = renderRail("/admin/iconic");
		expect(getByTestId("nav-group-trigger-Content").className).toContain("bg-accent");
	});
});
