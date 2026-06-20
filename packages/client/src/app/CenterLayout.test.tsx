/**
 * Layout dispatch tests: verifies that the persistent layout wrapper mounts
 * the correct shell based on the `layout` page prop.
 *
 * Mocks ONLY usePage + router from @inertiajs/react; the real Link passes
 * through. Bun mock.module is process-global, so a stub Link that dropped
 * props (data-testid, asChild) would leak into every later test file and
 * break actions that rely on asChild forwarding (M-95).
 */
import { describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Minimal @inertiajs/react mock — usePage + router only. Link stays REAL so
// no prop-dropping stub leaks across the process (mock.module is global).
// ---------------------------------------------------------------------------

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: currentProps, url: "/admin/test", flash: {} }),
	router: { post: mock(() => {}), on: mock(() => () => {}) },
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
