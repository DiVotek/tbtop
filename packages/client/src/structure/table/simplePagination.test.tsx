/**
 * Simple pagination footer — previous/next from hasMore, no total, no page list.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

beforeEach(() => {
	window.history.replaceState(null, "", "http://localhost/");
});
afterEach(() => {
	window.history.replaceState(null, "", "http://localhost/");
});

function seedPage(page: number) {
	const sp = new URLSearchParams();
	sp.set("t[items][page]", String(page));
	window.history.replaceState(null, "", `/?${sp.toString()}`);
}

function makeSimpleTable(hasMore: boolean, rows = 10) {
	return s.table({
		name: "items",
		query: async () => ({
			data: Array.from({ length: rows }, (_, i) => ({
				id: String(i + 1),
				title: `Row ${i}`,
			})),
			hasMore,
			page: 1,
			perPage: 10,
		}),
		columns: [{ name: "title", label: "Title" }],
		pagination: { perPage: 10, options: [10, 25], simple: true },
	} as Parameters<typeof s.table>[0]);
}

describe("SimplePagination", () => {
	test("shows previous/next and the current page, without a range or page numbers", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(
			<Wrap>{renderNode(makeSimpleTable(true))}</Wrap>,
		);

		expect((await findByTestId("pagination-current")).textContent).toBe("Page 1");
		expect(queryByTestId("pagination-range")).toBeNull();
		expect(queryByTestId("pagination-page-1")).toBeNull();
		expect(await findByTestId("pagination-prev")).toHaveProperty("disabled", true);
		expect(await findByTestId("pagination-next")).toHaveProperty("disabled", false);
	});

	test("disables next on the last page", async () => {
		seedPage(3);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(makeSimpleTable(false, 4))}</Wrap>);

		expect((await findByTestId("pagination-current")).textContent).toBe("Page 3");
		expect(await findByTestId("pagination-prev")).toHaveProperty("disabled", false);
		expect(await findByTestId("pagination-next")).toHaveProperty("disabled", true);
	});

	test("hides the footer on a first page with no next page", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(
			<Wrap>{renderNode(makeSimpleTable(false, 4))}</Wrap>,
		);

		await findByTestId("table-block");
		expect(queryByTestId("table-pagination")).toBeNull();
	});

	test("next moves to the following page in the URL", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(makeSimpleTable(true))}</Wrap>);
		const next = await findByTestId("pagination-next");
		await act(async () => {
			fireEvent.click(next);
		});

		await waitFor(() => {
			const search = decodeURIComponent(window.location.search);
			expect(search).toContain("t[items][page]=2");
		});
	});
});
