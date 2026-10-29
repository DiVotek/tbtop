/** Active-filter chips: shown for applied filters, removed in one click. */
import { describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { writeTableParams } from "./tableUrlState";
import { wrapForStructure as wrap } from "./testFixtures";

type Params = Record<string, unknown>;

function chipTable(captured: Params[], extra: Record<string, unknown> = {}) {
	return s.table({
		query: async (ctx) => {
			captured.push({ ...ctx.table?.queryParams });
			return [{ id: "1", title: "Alpha" }];
		},
		columns: [{ name: "title" }],
		filters: [
			{ kind: "text", name: "author", options: { label: "Author" }, meta: {} },
			{
				kind: "in",
				name: "status",
				options: {
					label: "Status",
					options: [
						{ value: "1", label: "Published" },
						{ value: "0", label: "Draft" },
					],
				},
				meta: {},
			},
		],
		filtersIn: "inline",
		...extra,
	} as Parameters<typeof s.table>[0]);
}

function filtersOf(p: Params | undefined): Params {
	return (p?.filters as Params | undefined) ?? {};
}

async function typeAuthor(container: HTMLElement, text: string) {
	const input = container.querySelector<HTMLInputElement>('input[name="author"]');
	if (!input) {
		throw new Error("author filter input not found");
	}
	const user = userEvent.setup({ delay: null });
	await act(async () => {
		await user.type(input, text);
	});
	return { input, user };
}

describe("table filter chips", () => {
	test("no chips while no filter is applied", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(chipTable([]))}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-filter-chips")).toBeNull();
	});

	test("an applied filter gets a chip; its × drops it and refetches", async () => {
		const captured: Params[] = [];
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(chipTable(captured))}</Wrap>);
		await findByTestId("table-block");
		const { input, user } = await typeAuthor(container, "jane");

		const chip = await findByTestId("table-filter-chip-author", {}, { timeout: 1000 });
		expect(chip.textContent).toContain("Author: jane");

		await act(async () => {
			await user.click(await findByTestId("table-filter-chip-remove-author"));
		});
		await waitFor(() => expect(filtersOf(captured.at(-1)).author).toBeUndefined());
		expect(input.value).toBe("");
		expect(container.querySelector('[data-testid="table-filter-chips"]')).toBeNull();
	});

	test("a deferred table shows no chip until Apply", async () => {
		const captured: Params[] = [];
		const Wrap = wrap(() => new Response("{}"));
		const node = chipTable(captured, { deferFilters: true });
		const { findByTestId, queryByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const { user } = await typeAuthor(container, "jane");
		expect(queryByTestId("table-filter-chip-author")).toBeNull();

		await act(async () => {
			await user.click(await findByTestId("table-filters-apply"));
		});
		await findByTestId("table-filter-chip-author");
	});

	test("URL-seeded filters show option labels; Clear filters keeps the search", async () => {
		const original = window.location.href;
		const params = writeTableParams(new URLSearchParams(), "posts", {
			search: "alpha",
			filters: { author: "jane", status: ["1", "0"] },
		});
		window.history.replaceState(null, "", `/?${params}`);
		try {
			const captured: Params[] = [];
			const Wrap = wrap(() => new Response("{}"));
			const node = { ...chipTable(captured), name: "posts" };
			const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
			const status = await findByTestId("table-filter-chip-status");
			expect(status.textContent).toContain("Status: Published, Draft");

			const user = userEvent.setup({ delay: null });
			await act(async () => {
				await user.click(await findByTestId("table-filter-chips-clear"));
			});
			await waitFor(() => expect(filtersOf(captured.at(-1))).toEqual({}));
			expect(captured.at(-1)?.search).toBe("alpha");
			expect(queryByTestId("table-filter-chips")).toBeNull();
		} finally {
			window.history.replaceState(null, "", original);
		}
	});

	test("an async select chip shows the label its onLoad resolves", async () => {
		const original = window.location.href;
		const params = writeTableParams(new URLSearchParams(), "users", {
			filters: { owner: "7" },
		});
		window.history.replaceState(null, "", `/?${params}`);
		try {
			type Row = { id: number; email: string };
			const node = s.table({
				query: async () => [],
				columns: [{ name: "title" }],
				filters: [
					{
						kind: "select",
						name: "owner",
						options: {
							label: "Owner",
							onLoad: async () => ({ id: 7, email: "jane@example.com" }),
							optionValue: (row: unknown) => String((row as Row).id),
							optionLabel: (row: unknown) => (row as Row).email,
						},
						meta: {},
					},
				],
				filtersIn: "modal",
			} as Parameters<typeof s.table>[0]);
			const Wrap = wrap(() => new Response("{}"));
			const { findByTestId } = render(<Wrap>{renderNode({ ...node, name: "users" })}</Wrap>);
			const chip = await findByTestId("table-filter-chip-owner");
			await waitFor(() => expect(chip.textContent).toContain("Owner: jane@example.com"));
		} finally {
			window.history.replaceState(null, "", original);
		}
	});
});
