/**
 * Layout dispatch tests: verifies that the persistent layout wrapper mounts
 * the correct shell based on the `layout` page prop.
 *
 * Uses mock.module for @inertiajs/react so usePage() returns controlled props.
 * This file is isolated — bun module mocks are process-global, so they are
 * declared here and never imported alongside files that need a different mock.
 */
import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Minimal @inertiajs/react mock — only usePage is needed for layout dispatch.
// ---------------------------------------------------------------------------

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	usePage: () => ({ props: currentProps, url: "/admin/test", flash: {} }),
	router: { post: mock(() => {}), on: mock(() => () => {}) },
	Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

// Import after mock.module so the mock is in effect.
import { AdminLayoutShell } from "./AdminLayout";
import { CenterLayout } from "./CenterLayout";

// ---------------------------------------------------------------------------
// CenterLayout unit tests
// ---------------------------------------------------------------------------

describe("CenterLayout", () => {
	test("CenterLayout: renders children without a sidebar or nav landmark", () => {
		const { getByText, queryByTestId } = render(
			<CenterLayout>
				<p>Centered content</p>
			</CenterLayout>,
		);
		expect(getByText("Centered content")).toBeTruthy();
		expect(queryByTestId("admin-sidebar")).toBeNull();
		expect(document.querySelector("aside")).toBeNull();
		expect(document.querySelector("nav")).toBeNull();
	});

	test("CenterLayout: full-viewport flex container centers content", () => {
		const { container } = render(
			<CenterLayout>
				<div>Inner</div>
			</CenterLayout>,
		);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("min-h-screen");
		expect(wrapper.className).toContain("items-center");
		expect(wrapper.className).toContain("justify-center");
	});
});

// ---------------------------------------------------------------------------
// AdminLayoutShell (existing shell) smoke test — confirms sidebar is present.
// ---------------------------------------------------------------------------

describe("AdminLayoutShell layout presence", () => {
	test("AdminLayoutShell: renders sidebar landmark", () => {
		const { getByTestId } = render(
			<AdminLayoutShell nav={[]} user={null} currentUrl="/">
				<div>Page</div>
			</AdminLayoutShell>,
		);
		expect(getByTestId("admin-sidebar")).toBeTruthy();
	});
});
