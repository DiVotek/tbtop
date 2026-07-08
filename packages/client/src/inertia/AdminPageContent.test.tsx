/**
 * AdminPage content rendering: title/subtitle (props.title / props.subtitle
 * -> h1 + <p>) and the content-wrapper width from tbtop.appearance.maxWidth.
 *
 * Mocks ONLY usePage + router from @inertiajs/react, mirroring
 * app/CenterLayout.test.tsx: bun mock.module is process-global, so a
 * prop-dropping stub for anything else (e.g. Link) would leak into later
 * test files.
 */
import { describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: currentProps, url: "/admin/posts", flash: {} }),
	router: { post: mock(() => {}), on: mock(() => () => {}) },
}));

// Import after mock.module so the mock is in effect.
import { AdminPage } from "./AdminPage";

const BASE_PROPS: PageProps = {
	slug: "posts-index",
	title: "Posts",
	structure: { kind: "stack", meta: {}, options: { children: [] } },
	data: {},
};

describe("AdminPage: title and subtitle", () => {
	test("renders the page title as an h1", () => {
		currentProps = { ...BASE_PROPS };
		const { getByRole } = render(<AdminPage />);
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Posts");
	});

	test("renders subtitle under the title when provided", () => {
		currentProps = { ...BASE_PROPS, subtitle: "All published posts" };
		const { getByText } = render(<AdminPage />);
		const subtitle = getByText("All published posts");
		expect(subtitle.tagName).toBe("P");
		expect(subtitle.className).toContain("text-muted-foreground");
	});

	test("renders nothing extra when subtitle is absent", () => {
		currentProps = { ...BASE_PROPS };
		const { getByRole, container } = render(<AdminPage />);
		const h1 = getByRole("heading", { level: 1 });
		expect(h1.parentElement?.querySelector("p")).toBeNull();
		expect(container.querySelectorAll("p")).toHaveLength(0);
	});
});

describe("AdminPage: content width from appearance.maxWidth", () => {
	test("defaults the content wrapper to max-w-5xl without appearance", () => {
		currentProps = { ...BASE_PROPS };
		const { getByRole } = render(<AdminPage />);
		expect(getByRole("heading", { level: 1 }).closest(".max-w-5xl")).toBeTruthy();
	});

	test("appearance.maxWidth widens the content wrapper", () => {
		currentProps = { ...BASE_PROPS, tbtop: { appearance: { maxWidth: "full" } } };
		const { getByRole } = render(<AdminPage />);
		const h1 = getByRole("heading", { level: 1 });
		expect(h1.closest(".max-w-full")).toBeTruthy();
		expect(h1.closest(".max-w-5xl")).toBeNull();
	});

	test("an unknown maxWidth token falls back to max-w-5xl", () => {
		currentProps = { ...BASE_PROPS, tbtop: { appearance: { maxWidth: "8xl" } } };
		const { getByRole } = render(<AdminPage />);
		expect(getByRole("heading", { level: 1 }).closest(".max-w-5xl")).toBeTruthy();
	});
});
