/**
 * AdminPage content rendering: title/subtitle (props.title / props.subtitle
 * -> h1 + <p>) and the content-wrapper width from tbtop.appearance.maxWidth.
 *
 * Mocks ONLY usePage + router from @inertiajs/react, mirroring
 * app/CenterLayout.test.tsx: bun mock.module is process-global, so a
 * prop-dropping stub for anything else (e.g. Link) would leak into later
 * test files.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";
import { registerBlock } from "../render/blockRegistry";

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: currentProps, url: "/admin/posts", flash: {} }),
	router: { post: mock(() => {}), on: mock(() => () => {}) },
	Head: () => null,
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

describe("AdminPage: headerActions", () => {
	test("renders a headerActions visit action right of the title block", () => {
		currentProps = {
			...BASE_PROPS,
			headerActions: [
				{
					kind: "action",
					name: "create",
					options: {
						label: "New item",
						spec: { type: "visit", href: "/admin/posts/create" },
					},
					meta: {},
				},
			],
		};
		const { getByTestId, getByText } = render(<AdminPage />);
		const actions = getByTestId("page-header-actions");
		expect(getByText("New item")).toBeTruthy();
		expect(actions.querySelector("a")?.getAttribute("href")).toBe("/admin/posts/create");
	});

	test("renders nothing extra when headerActions is absent", () => {
		currentProps = { ...BASE_PROPS };
		const { queryByTestId } = render(<AdminPage />);
		expect(queryByTestId("page-header-actions")).toBeNull();
	});

	test("renders nothing extra when headerActions is an empty array", () => {
		currentProps = { ...BASE_PROPS, headerActions: [] };
		const { queryByTestId } = render(<AdminPage />);
		expect(queryByTestId("page-header-actions")).toBeNull();
	});

	test("renders multiple headerActions in order", () => {
		currentProps = {
			...BASE_PROPS,
			headerActions: [
				{
					kind: "action",
					name: "create",
					options: {
						label: "New item",
						spec: { type: "visit", href: "/admin/posts/create" },
					},
					meta: {},
				},
				{
					kind: "action",
					name: "export",
					options: {
						label: "Export",
						spec: { type: "visit", href: "/admin/posts/export" },
					},
					meta: {},
				},
			],
		};
		const { getByTestId } = render(<AdminPage />);
		const labels = Array.from(getByTestId("page-header-actions").querySelectorAll("a")).map(
			(a) => a.textContent,
		);
		expect(labels).toEqual(["New item", "Export"]);
	});
});

describe("AdminPage: page content error boundary", () => {
	const originalError = console.error;
	beforeEach(() => {
		console.error = () => {};
		registerBlock({
			kind: "bomb",
			behavior: "leaf",
			render: () => {
				throw new Error("invalid SelectItem: value cannot be empty");
			},
		});
	});
	afterEach(() => {
		console.error = originalError;
	});

	test("a crashing structure node shows the fallback card without blanking the page title", () => {
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "bomb", meta: {}, options: {} },
		};
		const { getByRole, getByTestId, getByText } = render(<AdminPage />);
		// The title block (outside the boundary) still renders — only the
		// content tree inside the boundary is replaced by the fallback.
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Posts");
		expect(getByTestId("page-content-error-boundary")).toBeTruthy();
		expect(getByText("invalid SelectItem: value cannot be empty")).toBeTruthy();
	});
});

/**
 * materialize() runs inside AdminPage's own render, so a throw there escapes
 * PageContentErrorBoundary (which only catches descendants) and used to blank
 * the whole app. A table node with null options throws eagerly in
 * materializeTable; an action node with no options throws in
 * materializeActionOptions.
 */
describe("AdminPage: materialize failures", () => {
	const originalError = console.error;
	beforeEach(() => {
		console.error = () => {};
	});
	afterEach(() => {
		console.error = originalError;
	});

	test("a throwing materialize shows the error panel instead of a white screen", () => {
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "table", name: "posts", meta: {}, options: null },
		};
		const { getByRole, getByTestId } = render(<AdminPage />);
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Posts");
		expect(getByTestId("page-content-error-boundary")).toBeTruthy();
		expect(getByTestId("page-content-error-reload")).toBeTruthy();
	});

	test("logs the failure so the stack survives past the on-screen message", () => {
		const logged: unknown[] = [];
		console.error = (...args: unknown[]) => {
			logged.push(...args);
		};
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "table", name: "posts", meta: {}, options: null },
		};
		render(<AdminPage />);
		expect(logged.some((arg) => arg instanceof Error)).toBe(true);
	});

	test("a failing header action keeps page content rendering", () => {
		registerBlock({
			kind: "healthy",
			behavior: "leaf",
			render: () => <div data-testid="healthy-content">Content survived</div>,
		});
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "healthy", meta: {}, options: {} },
			headerActions: [{ kind: "action", name: "broken", meta: {} }],
		};
		const { getByTestId, queryByTestId } = render(<AdminPage />);
		expect(getByTestId("healthy-content")).toBeTruthy();
		expect(queryByTestId("page-header-actions")).toBeNull();
		expect(queryByTestId("page-content-error-boundary")).toBeTruthy();
	});

	test("failing page content keeps healthy header actions rendering", () => {
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "table", name: "posts", meta: {}, options: null },
			headerActions: [
				{
					kind: "action",
					name: "create",
					options: {
						label: "New item",
						spec: { type: "visit", href: "/admin/posts/create" },
					},
					meta: {},
				},
			],
		};
		const { getByTestId, getByText } = render(<AdminPage />);
		expect(getByTestId("page-header-actions")).toBeTruthy();
		expect(getByText("New item")).toBeTruthy();
		expect(getByTestId("page-content-error-boundary")).toBeTruthy();
	});

	test("page-content-error-boundary stays the only error-screen testid", () => {
		currentProps = {
			...BASE_PROPS,
			structure: { kind: "table", name: "posts", meta: {}, options: null },
			headerActions: [{ kind: "action", name: "broken", meta: {} }],
		};
		const { container, getAllByTestId } = render(<AdminPage />);
		expect(getAllByTestId("page-content-error-boundary")).toHaveLength(2);
		expect(container.querySelectorAll('[data-testid$="-error"]')).toHaveLength(0);
	});
});
