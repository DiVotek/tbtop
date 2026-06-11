/**
 * Predefined table tabs: tab bar rendering, tab switch refetch + URL state,
 * count badges, and URL seeding — wired through the real materialize() path
 * so the query fn is the one that calls actionCtx.client.get.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure } from "./testFixtures";
import type { StructureNode } from "./types";

function tabbedTableNode(): StructureNode {
	return {
		kind: "table",
		name: "posts",
		options: {
			columns: [{ name: "title", label: "Title" }],
			tabs: [
				{ name: "all", label: "All", count: false },
				{ name: "published", label: "Published", count: true },
				{ name: "draft", label: "Drafts", count: false },
			],
		},
		meta: {},
	};
}

function materializeTabbedTable(): StructureNode {
	return materialize(tabbedTableNode(), { basePath: "/admin/posts", data: {} });
}

function rowsResponse(tabCounts?: Record<string, number>): Response {
	return new Response(
		JSON.stringify({
			data: {
				data: [{ id: "1", title: "Alpha" }],
				total: 1,
				page: 1,
				perPage: 25,
				tabCounts,
			},
		}),
	);
}

let originalReplaceState: typeof window.history.replaceState;

beforeEach(() => {
	originalReplaceState = window.history.replaceState.bind(window.history);
	originalReplaceState(null, "", "http://localhost/");
});

afterEach(() => {
	window.history.replaceState = originalReplaceState;
	originalReplaceState(null, "", "http://localhost/");
});

describe("TableBlock tabs: tab bar renders from wire options", () => {
	test("TableBlock: renders one trigger per declared tab, first tab active", async () => {
		const Wrap = wrapForStructure(() => rowsResponse());

		const { findByTestId } = render(<Wrap>{renderNode(materializeTabbedTable())}</Wrap>);
		await findByTestId("table-tabs");

		const all = await findByTestId("table-tab-all");
		const published = await findByTestId("table-tab-published");
		const draft = await findByTestId("table-tab-draft");

		expect(all.textContent).toContain("All");
		expect(published.textContent).toContain("Published");
		expect(draft.textContent).toContain("Drafts");
		expect(all.getAttribute("data-state")).toBe("active");
	});
});

describe("TableBlock tabs: clicking a tab refetches with the tab param and persists URL state", () => {
	test("TableBlock: tab click sends tab=published and mirrors t[posts][tab] into the URL", async () => {
		const fetchCalls: Request[] = [];
		const Wrap = wrapForStructure((req) => {
			fetchCalls.push(req);
			return rowsResponse();
		});

		const user = userEvent.setup({ delay: null });
		const { findByTestId } = render(<Wrap>{renderNode(materializeTabbedTable())}</Wrap>);
		const trigger = await findByTestId("table-tab-published");
		const initialCallCount = fetchCalls.length;

		await act(async () => {
			await user.click(trigger);
		});

		await waitFor(() => {
			expect(fetchCalls.length).toBeGreaterThan(initialCallCount);
		});
		const lastUrl = fetchCalls[fetchCalls.length - 1]?.url ?? "";
		expect(lastUrl).toContain("/tables/posts");
		expect(lastUrl).toContain("tab=published");

		await waitFor(() => {
			expect(window.location.search).toContain(
				`${encodeURIComponent("t[posts][tab]")}=published`,
			);
		});
		expect(trigger.getAttribute("data-state")).toBe("active");
	});
});

describe("TableBlock tabs: count badges", () => {
	test("TableBlock: count-enabled tab shows its count from the response, others stay bare", async () => {
		const Wrap = wrapForStructure(() => rowsResponse({ published: 7 }));

		const { findByTestId, queryByTestId } = render(
			<Wrap>{renderNode(materializeTabbedTable())}</Wrap>,
		);
		const badge = await findByTestId("table-tab-count-published");

		expect(badge.textContent).toBe("7");
		expect(queryByTestId("table-tab-count-all")).toBeNull();
		expect(queryByTestId("table-tab-count-draft")).toBeNull();
	});
});

describe("TableBlock tabs: active tab seeds from the URL on mount", () => {
	test("TableBlock: t[posts][tab]=draft makes the first fetch tab-scoped and the trigger active", async () => {
		const sp = new URLSearchParams();
		sp.set("t[posts][tab]", "draft");
		originalReplaceState(null, "", `/?${sp.toString()}`);

		const fetchCalls: Request[] = [];
		const Wrap = wrapForStructure((req) => {
			fetchCalls.push(req);
			return rowsResponse();
		});

		const { findByTestId } = render(<Wrap>{renderNode(materializeTabbedTable())}</Wrap>);
		const trigger = await findByTestId("table-tab-draft");

		await waitFor(() => {
			expect(fetchCalls.length).toBeGreaterThan(0);
		});
		expect(fetchCalls[0]?.url).toContain("tab=draft");
		expect(trigger.getAttribute("data-state")).toBe("active");
	});
});
