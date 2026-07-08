/**
 * Page title/subtitle rendering (props.title / props.subtitle -> h1 + <p>).
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
