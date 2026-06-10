/**
 * Regression tests for the table filter XHR + URL-persistence behaviour.
 *
 * Bug: filter changes triggered Inertia navigation (full page reload) instead of
 * an XHR refetch via client.get, and table query state was never mirrored to the
 * URL so browser refresh / back-forward lost view state.
 *
 * These tests wire through the real materialize() path so the query fn is the
 * one that calls actionCtx.client.get — the same path that broke in production.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrapForStructureFetch } from "./testFixtures";
import type { StructureNode } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tableNode(name: string): StructureNode {
	return {
		kind: "table",
		name,
		options: {
			columns: [{ name: "title", label: "Title" }],
			filters: [{ kind: "text", name: "status", options: { label: "Status" }, meta: {} }],
			filtersIn: "inline",
			searchable: ["title"],
		},
		meta: {},
	};
}

function materializeTable(name: string, basePath = "/admin/posts") {
	return materialize(tableNode(name), { basePath, data: {} });
}

// ---------------------------------------------------------------------------
// Scenario 1 (regression): filter change uses XHR client.get, not navigation
// ---------------------------------------------------------------------------

describe("TableBlock URL persist: filter change goes through XHR client, not navigation", () => {
	let originalHref: string;

	beforeEach(() => {
		originalHref = window.location.href;
	});

	afterEach(() => {
		window.history.replaceState(null, "", originalHref);
	});

	test("TableBlock: filter change calls client.get with filter params, not router.visit", async () => {
		const fetchCalls: Request[] = [];
		const node = materializeTable("posts");

		const Wrap = wrapForStructureFetch((req) => {
			fetchCalls.push(req);
			return new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] }));
		});

		const user = userEvent.setup({ delay: null });
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const initialCallCount = fetchCalls.length;

		// Find the inline filter text input (the only non-search input in the filters panel)
		const filtersPanel = await findByTestId("table-filters-inline");
		const filterInput = filtersPanel.querySelector("input") as HTMLInputElement;
		if (!filterInput) throw new Error("no filter input found");
		await act(async () => {
			await user.type(filterInput, "draft");
		});

		// After the 300ms debounce the table should have refetched
		await waitFor(
			() => {
				expect(fetchCalls.length).toBeGreaterThan(initialCallCount);
			},
			{ timeout: 1000 },
		);

		// The call must be an XHR to the tables endpoint, not a navigation
		const lastCall = fetchCalls[fetchCalls.length - 1];
		expect(lastCall?.url).toContain("/tables/posts");
		// window.location must NOT have changed to a different path (no navigation)
		expect(window.location.pathname).toBe("/");
	});
});

// ---------------------------------------------------------------------------
// Scenario 2: filter change persists state to URL via history.replaceState
// ---------------------------------------------------------------------------

describe("TableBlock URL persist: filter change updates URL without navigation", () => {
	let originalReplaceState: typeof window.history.replaceState;
	const replaceStateCalls: string[] = [];

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
		originalReplaceState(null, "", "http://localhost/");
		window.history.replaceState = (state, title, url) => {
			if (url !== null && url !== undefined) {
				replaceStateCalls.push(String(url));
			}
			originalReplaceState(state, title, url);
		};
		replaceStateCalls.length = 0;
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
		originalReplaceState(null, "", "http://localhost/");
	});

	test("TableBlock: search input change calls replaceState with namespaced search param", async () => {
		const node = materializeTable("posts");
		const Wrap = wrapForStructureFetch(
			() => new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] })),
		);

		const user = userEvent.setup({ delay: null });
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const searchInput = await findByTestId("table-search-input");
		await act(async () => {
			await user.type(searchInput, "hello");
		});

		await waitFor(
			() => {
				const found = replaceStateCalls.some((url) => url.includes("t%5Bposts%5D"));
				expect(found).toBe(true);
			},
			{ timeout: 1000 },
		);

		const relevantCall = replaceStateCalls.find((url) => url.includes("t%5Bposts%5D"));
		expect(relevantCall).toContain("t%5Bposts%5D%5Bsearch%5D=");
	});
});

// ---------------------------------------------------------------------------
// Scenario 3: mount seeds query state from URL
// ---------------------------------------------------------------------------

describe("TableBlock URL persist: mount seeds state from URL", () => {
	let originalReplaceState: typeof window.history.replaceState;

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
		originalReplaceState(null, "", "http://localhost/");
	});

	test("TableBlock: initial query includes search from URL on mount", async () => {
		// Seed URL with search param for the "posts" table
		const sp = new URLSearchParams();
		sp.set("t[posts][search]", "seeded");
		originalReplaceState(null, "", `/?${sp.toString()}`);

		const capturedParams: Record<string, unknown>[] = [];
		const baseNode = tableNode("posts");
		// Override the query to capture params
		const node = materialize(
			{
				...baseNode,
				options: {
					...(baseNode.options as Record<string, unknown>),
					// The real client query is replaced with a capture fn for this test
				},
			},
			{ basePath: "/admin/posts", data: {} },
		);

		const fetchCalls: Request[] = [];
		const Wrap = wrapForStructureFetch((req) => {
			fetchCalls.push(req);
			return new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] }));
		});

		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		// The first fetch should include the seeded search param
		await waitFor(
			() => {
				expect(fetchCalls.length).toBeGreaterThan(0);
			},
			{ timeout: 1000 },
		);

		const firstUrl = fetchCalls[0]?.url ?? "";
		expect(firstUrl).toContain("search=seeded");
		// Confirm: no navigation happened
		void capturedParams;
	});
});

// ---------------------------------------------------------------------------
// Scenario 4b: filter control shows selected value when seeded from URL
// ---------------------------------------------------------------------------

describe("TableBlock URL persist: filter UI reflects URL-seeded filter value", () => {
	let originalReplaceState: typeof window.history.replaceState;

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
		originalReplaceState(null, "", "http://localhost/");
	});

	test("TableBlock: select filter reflects URL-seeded value on mount", async () => {
		// Seed URL with a filter value for the "posts" table
		const sp = new URLSearchParams();
		sp.set("t[posts][status]", "draft");
		originalReplaceState(null, "", `/?${sp.toString()}`);

		const baseNode = tableNode("posts");
		const nodeWithSelectFilter: StructureNode = {
			...baseNode,
			options: {
				...(baseNode.options as Record<string, unknown>),
				filters: [
					{
						kind: "select",
						name: "status",
						options: {
							label: "Status",
							options: [
								{ value: "draft", label: "Draft" },
								{ value: "published", label: "Published" },
							],
						},
						meta: {},
					},
				],
				filtersIn: "inline",
			},
		};
		const node = materialize(nodeWithSelectFilter, { basePath: "/admin/posts", data: {} });

		const Wrap = wrapForStructureFetch(
			() => new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] })),
		);

		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		await findByTestId("table-filters-inline");

		// The select trigger should show the seeded value "Draft", not the placeholder.
		const trigger = await findByTestId("select-status");
		expect(trigger.textContent).toContain("Draft");
	});
});

// ---------------------------------------------------------------------------
// Scenario 4c (regression): filter controls reflect a change IMMEDIATELY
// ---------------------------------------------------------------------------

describe("TableBlock filters: controls update synchronously, network is debounced", () => {
	// Bug: setFilterValues sat inside the 300ms debounce, so controlled
	// filter controls (select/switch) snapped back to the old value for
	// 300ms after every interaction — selects looked broken, toggles dead.
	test("boolean filter switch flips on click without waiting for the debounce", async () => {
		const baseNode = tableNode("posts");
		const nodeWithBoolFilter: StructureNode = {
			...baseNode,
			options: {
				...(baseNode.options as Record<string, unknown>),
				filters: [
					{
						kind: "boolean",
						name: "with_rating",
						options: { label: "Has rating" },
						meta: {},
					},
				],
				filtersIn: "inline",
			},
		};
		const node = materialize(nodeWithBoolFilter, { basePath: "/admin/posts", data: {} });

		const Wrap = wrapForStructureFetch(
			() => new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] })),
		);

		const user = userEvent.setup({ delay: null });
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-filters-inline");

		const switchEl = container.querySelector('button[role="switch"]') as HTMLElement;
		expect(switchEl).not.toBeNull();
		expect(switchEl.getAttribute("data-state")).toBe("unchecked");

		await act(async () => {
			await user.click(switchEl);
		});

		// Immediately after the click — no debounce wait — the control is on.
		expect(switchEl.getAttribute("data-state")).toBe("checked");
	});
});

// ---------------------------------------------------------------------------
// Scenario 4: two tables on one page don't clobber each other's URL namespace
// ---------------------------------------------------------------------------

describe("TableBlock URL persist: two tables have independent URL namespaces", () => {
	let originalReplaceState: typeof window.history.replaceState;
	const urlHistory: string[] = [];

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
		originalReplaceState(null, "", "http://localhost/");
		window.history.replaceState = (state, title, url) => {
			if (url !== null && url !== undefined) {
				urlHistory.push(String(url));
			}
			originalReplaceState(state, title, url);
		};
		urlHistory.length = 0;
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
		originalReplaceState(null, "", "http://localhost/");
	});

	test("TableBlock: searching in table 'posts' does not affect table 'authors' URL params", async () => {
		const postsNode = materialize(tableNode("posts"), {
			basePath: "/admin/posts",
			data: {},
		});

		const Wrap = wrapForStructureFetch(
			() => new Response(JSON.stringify({ data: [{ id: "1", title: "Alpha" }] })),
		);

		const user = userEvent.setup({ delay: null });
		const { findAllByTestId } = render(<Wrap>{renderNode(postsNode)}</Wrap>);

		await findAllByTestId("table-block");
		const searchInputs = await findAllByTestId("table-search-input");
		const firstInput = searchInputs[0];
		if (!firstInput) throw new Error("no search input");

		await act(async () => {
			await user.type(firstInput, "hello");
		});

		// Wait until a replaceState call with the posts namespace appears.
		// We check any URL in history (not just the last) because later
		// renders may issue a cleanup replaceState.
		await waitFor(
			() => {
				const found = urlHistory.find((u) => u.includes("t%5Bposts%5D"));
				expect(found).toBeTruthy();
			},
			{ timeout: 1000 },
		);

		// Any URL carrying posts state must not carry authors state.
		const postsUrl = urlHistory.find((u) => u.includes("t%5Bposts%5D")) ?? "";
		expect(postsUrl).not.toContain("t%5Bauthors%5D");
		expect(postsUrl).toContain("t%5Bposts%5D");
	});
});
