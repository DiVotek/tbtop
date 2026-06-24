import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { ClientProvider } from "../data/client";
import type { StructureNode } from "../structure/types";
import { AdminLayoutShell, type ChromeTrees } from "./AdminLayout";

const DEFAULT_USER = { name: "Alice Smith", email: "alice@example.com" };
const DEFAULT_NAV = [{ group: "Content", items: [{ label: "Posts", href: "/admin/posts" }] }];

function node(kind: string, options: Record<string, unknown> = {}, name?: string): StructureNode {
	return name ? { kind, name, options, meta: {} } : { kind, options, meta: {} };
}

/** Mirrors what the PHP default Chrome serializes per area. */
function defaultChrome(): ChromeTrees {
	return {
		header: node("row", { children: [node("userMenu")] }),
		sidebar: node("stack", { children: [node("logo"), node("navMenu")] }),
		footer: null,
	};
}

function renderShell(
	chrome: ChromeTrees,
	extra: Partial<Parameters<typeof AdminLayoutShell>[0]> = {},
) {
	return render(
		// ClientProvider mirrors the AdminShell wiring: chrome action blocks
		// resolve their data client from it.
		<ClientProvider apiBase="">
			<AdminLayoutShell
				nav={DEFAULT_NAV}
				user={DEFAULT_USER}
				currentUrl="/admin/posts"
				chrome={chrome}
				{...extra}
			>
				<div>Page content</div>
			</AdminLayoutShell>
		</ClientProvider>,
	);
}

describe("AdminLayout chrome trees", () => {
	test("default chrome trees render the sidebar nav and user menu landmarks", () => {
		const { getByTestId, getByText } = renderShell(defaultChrome());

		expect(getByTestId("admin-sidebar")).toBeTruthy();
		expect(getByText("Posts")).toBeTruthy();
		expect(getByText("Tabletop")).toBeTruthy();
		expect(getByTestId("profile-trigger")).toBeTruthy();
	});

	test("a chrome header with an appended visit action renders it next to the user menu", () => {
		const chrome = defaultChrome();
		const action = node(
			"action",
			{ label: "View site", spec: { type: "visit", href: "/" } },
			"view-site",
		);
		chrome.header = node("row", { children: [node("userMenu"), action] });

		const { getByTestId, getByText } = renderShell(chrome);

		expect(getByTestId("profile-trigger")).toBeTruthy();
		// Asserted via label + href, not the action testid: another suite
		// mocks @inertiajs/react globally with a Link that drops extra props.
		expect(getByText("View site").closest("a")?.getAttribute("href")).toBe("/");
	});

	test("a chrome footer tree renders inside the footer element", () => {
		const chrome = defaultChrome();
		chrome.footer = node("row", {
			children: [node("displayText", { content: "Footer note", variant: "muted" })],
		});

		const { container } = renderShell(chrome);

		expect(container.querySelector("footer")?.textContent).toContain("Footer note");
	});

	test("React slots still override the chrome trees", () => {
		const { getByTestId, queryByTestId } = renderShell(defaultChrome(), {
			slots: {
				header: () => <div data-testid="custom-header">Custom header</div>,
				sidebar: () => <nav data-testid="custom-sidebar">My nav</nav>,
			},
		});

		expect(getByTestId("custom-header")).toBeTruthy();
		expect(getByTestId("custom-sidebar")).toBeTruthy();
		expect(queryByTestId("profile-trigger")).toBeNull();
		expect(queryByTestId("admin-sidebar")).toBeNull();
	});

	test("the logo block prefers the panel brand over the default title", () => {
		const { getByText, queryByText } = renderShell(defaultChrome(), { brand: "EasyCar" });

		expect(getByText("EasyCar")).toBeTruthy();
		expect(queryByText("Tabletop")).toBeNull();
	});

	test("the sidebar layout (default) renders a left aside", () => {
		const { container } = renderShell(defaultChrome());

		expect(container.querySelector("aside")).toBeTruthy();
	});

	test("topbar navigation renders nav, user menu, and mobile drawer in a bar (no aside)", () => {
		const { container, getByTestId } = renderShell(defaultChrome(), { navigation: "topbar" });

		// Same chrome blocks, rearranged: no left sidebar column.
		expect(container.querySelector("aside")).toBeNull();
		expect(getByTestId("admin-sidebar")).toBeTruthy();
		expect(getByTestId("profile-trigger")).toBeTruthy();
		// Mobile parity: the burger drawer trigger is still present.
		expect(getByTestId("sidebar-trigger")).toBeTruthy();
	});

	test("topbar renders each nav group as a dropdown trigger (items hidden until opened)", () => {
		const { getByTestId, queryByText } = renderShell(defaultChrome(), { navigation: "topbar" });

		expect(getByTestId("nav-group-trigger-Content")).toBeTruthy();
		expect(queryByText("Posts")).toBeNull();
	});

	test("topbar nav dropdown reveals the group's item links when opened", async () => {
		const { getByTestId, findByText } = renderShell(defaultChrome(), { navigation: "topbar" });

		await act(async () => {
			const trigger = getByTestId("nav-group-trigger-Content");
			fireEvent.pointerDown(trigger, { bubbles: true, cancelable: true, isPrimary: true });
			fireEvent.click(trigger);
		});

		expect(await findByText("Posts")).toBeTruthy();
	});
});
