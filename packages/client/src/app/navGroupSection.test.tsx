import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { AdminLayoutShell } from "./AdminLayout";
import type { NavGroup } from "./chromeContext";
import { DensityContext } from "./densityContext";
import { NavItemLink } from "./navGroupSection";

const USER = { name: "Alice", email: "alice@example.com" };

const NAV: NavGroup[] = [
	{
		key: "Overview",
		group: "Overview",
		icon: { name: "star", position: "left" },
		items: [
			{
				label: "Dashboard",
				href: "/admin/dashboard",
				icon: { name: "star", position: "left" },
			},
		],
	},
	{
		key: "Content",
		group: "Content",
		collapsible: true,
		items: [
			{
				label: "Iconic",
				href: "/admin/iconic",
				icon: { name: "file-text", position: "left" },
				badge: "3",
				badgeColor: "danger",
			},
			{ label: "Plain", href: "/admin/plain" },
		],
	},
	{
		key: "System",
		group: "System",
		collapsible: true,
		collapsed: true,
		items: [{ label: "Settings", href: "/admin/settings" }],
	},
];

function renderNav() {
	return render(
		<AdminLayoutShell nav={NAV} user={USER} currentUrl="/admin">
			<div />
		</AdminLayoutShell>,
	);
}

describe("NavGroupSection", () => {
	test("renders an item icon (svg) and a color-mapped badge", () => {
		const { getByText, getByTestId } = renderNav();
		const link = getByText("Iconic").closest("a");
		expect(link?.querySelector("svg")).toBeTruthy();

		const badge = getByTestId("nav-badge");
		expect(badge.textContent).toBe("3");
		// badgeColor "danger" resolves through the shared color registry.
		expect(badge.className).toContain("bg-destructive");
	});

	test("an item without an icon renders no svg", () => {
		const { getByText } = renderNav();
		expect(getByText("Plain").closest("a")?.querySelector("svg")).toBeNull();
	});

	test("a non-collapsible group renders its heading icon", () => {
		const { getByText } = renderNav();
		// Overview is a plain group: the only svg in its heading is the group icon.
		expect(getByText("Overview").parentElement?.querySelector("svg")).toBeTruthy();
	});

	test("a collapsible group toggles its items on click", () => {
		const { getByTestId, getByText, queryByText } = renderNav();
		expect(getByText("Iconic")).toBeTruthy();

		fireEvent.click(getByTestId("nav-group-toggle-Content"));
		expect(queryByText("Iconic")).toBeNull();

		fireEvent.click(getByTestId("nav-group-toggle-Content"));
		expect(getByText("Iconic")).toBeTruthy();
	});

	test("a collapsed group hides its items until expanded", () => {
		const { getByTestId, getByText, queryByText } = renderNav();
		expect(queryByText("Settings")).toBeNull();

		fireEvent.click(getByTestId("nav-group-toggle-System"));
		expect(getByText("Settings")).toBeTruthy();
	});

	test("persists a group's collapse choice to localStorage on toggle", () => {
		window.localStorage.clear();
		const { getByTestId } = renderNav();

		fireEvent.click(getByTestId("nav-group-toggle-Content")); // collapse Content
		const stored = JSON.parse(window.localStorage.getItem("tbtop:nav-collapsed") ?? "{}");
		expect(stored.Content).toBe(false);
	});

	test("restores a stored collapse choice over the server default", () => {
		window.localStorage.clear();
		// System defaults collapsed; a stored "expanded" should win on load.
		window.localStorage.setItem("tbtop:nav-collapsed", JSON.stringify({ System: true }));

		const { getByText } = renderNav();
		expect(getByText("Settings")).toBeTruthy();
	});

	test("when key differs from the localized group label, the label renders but the testid and persistence key follow the stable key", () => {
		window.localStorage.clear();
		const localizedNav: NavGroup[] = [
			{
				key: "content",
				group: "Контент",
				collapsible: true,
				items: [{ label: "Iconic", href: "/admin/iconic" }],
			},
		];
		const { getByTestId, getByText, queryByText } = render(
			<AdminLayoutShell nav={localizedNav} user={USER} currentUrl="/admin">
				<div />
			</AdminLayoutShell>,
		);

		expect(getByText("Контент")).toBeTruthy();
		fireEvent.click(getByTestId("nav-group-toggle-content"));
		expect(queryByText("Iconic")).toBeNull();

		const stored = JSON.parse(window.localStorage.getItem("tbtop:nav-collapsed") ?? "{}");
		expect(stored.content).toBe(false);
	});
});

describe("NavItemLink density", () => {
	const ITEM = { label: "Posts", href: "/admin/posts" };

	test("default density uses px-2 py-1.5", () => {
		const { getByText } = render(<NavItemLink item={ITEM} currentUrl="/admin" />);
		const link = getByText("Posts").closest("a");
		expect(link?.className).toContain("px-2");
		expect(link?.className).toContain("py-1.5");
	});

	test("compact density uses px-3 py-2", () => {
		const { getByText } = render(
			<DensityContext.Provider value="compact">
				<NavItemLink item={ITEM} currentUrl="/admin" />
			</DensityContext.Provider>,
		);
		const link = getByText("Posts").closest("a");
		expect(link?.className).toContain("px-3");
		expect(link?.className).toContain("py-2");
	});
});

describe("NavItemNode (nested nav)", () => {
	const NESTED_NAV: NavGroup[] = [
		{
			key: "System",
			group: "System",
			items: [
				{
					label: "Settings",
					href: "/admin/settings",
					children: [
						{ label: "General", href: "/admin/settings/general" },
						{ label: "Mail", href: "/admin/settings/mail" },
					],
				},
			],
		},
	];

	function renderNested(currentUrl = "/admin") {
		return render(
			<AdminLayoutShell nav={NESTED_NAV} user={USER} currentUrl={currentUrl}>
				<div />
			</AdminLayoutShell>,
		);
	}

	test("children are hidden until the parent toggle is expanded", () => {
		const { queryByText } = renderNested();
		expect(queryByText("General")).toBeNull();
		expect(queryByText("Mail")).toBeNull();
	});

	test("clicking the parent toggle reveals its children", () => {
		const { getByTestId, getByText } = renderNested();
		fireEvent.click(getByTestId("nav-item-toggle-/admin/settings"));
		expect(getByText("General")).toBeTruthy();
		expect(getByText("Mail")).toBeTruthy();
	});

	test("auto-expands when the current URL matches a descendant", () => {
		const { getByText } = renderNested("/admin/settings/general");
		expect(getByText("General")).toBeTruthy();
	});

	test("the parent row itself still links to its own page", () => {
		const { getByText } = renderNested();
		expect(getByText("Settings").closest("a")?.getAttribute("href")).toBe("/admin/settings");
	});
});
