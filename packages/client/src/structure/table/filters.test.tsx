/**
 * InlineFilters/ModalFilters layout: formColumns grid-cols application,
 * formWidth applied to the modal's dialog content.
 */
import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../../render/registerBuiltins";
import { wrapForStructure as wrap } from "../testFixtures";
import { InlineFilters, ModalFilters } from "./filters";

ensureBuiltinsRegistered();

const FILTER_NODE = { kind: "text", name: "q", options: { label: "Q" }, meta: {} };

function noop() {}

describe("InlineFilters: formColumns grid layout", () => {
	test("applies grid-cols-1 sm:grid-cols-2 when formColumns=2", () => {
		const { container } = render(
			<InlineFilters
				filters={[FILTER_NODE]}
				filterValues={{}}
				onFilterChange={noop}
				onReset={noop}
				activeCount={0}
				formColumns={2}
			/>,
		);
		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-1");
		expect(grid?.className).toContain("sm:grid-cols-2");
	});

	test("falls back to a flex-wrap layout when formColumns is unset", () => {
		const { container } = render(
			<InlineFilters
				filters={[FILTER_NODE]}
				filterValues={{}}
				onFilterChange={noop}
				onReset={noop}
				activeCount={0}
			/>,
		);
		expect(container.querySelector(".grid")).toBeNull();
	});

	test("supplies sibling filter values to async dependsOn queries", async () => {
		const query = mock(
			async (_ctx: unknown, _search: string, deps?: Record<string, string>) => [
				{ value: deps?.country ?? "", label: "Paris" },
			],
		);
		const filters = [
			{
				kind: "select",
				name: "country",
				options: { options: [{ value: "fr", label: "France" }] },
				meta: {},
			},
			{
				kind: "select",
				name: "city",
				options: {
					dependsOn: ["country"],
					query,
					onLoad: async () => ({ value: "par", label: "Paris" }),
					optionValue: (row: unknown) => (row as { value: string }).value,
					optionLabel: (row: unknown) => (row as { label: string }).label,
				},
				meta: {},
			},
		];
		const Wrap = wrap(() => new Response("{}"));

		function Harness() {
			const [values, setValues] = useState<Record<string, unknown>>({ country: "fr" });
			return (
				<InlineFilters
					filters={filters}
					filterValues={values}
					onFilterChange={(name, value) =>
						setValues((current) => ({ ...current, [name]: value }))
					}
					onReset={() => setValues({})}
					activeCount={1}
				/>
			);
		}

		render(
			<Wrap>
				<Harness />
			</Wrap>,
		);

		await waitFor(() => expect(query).toHaveBeenCalled());
		expect(query.mock.calls[0]?.[2]).toEqual({ country: "fr" });
	});
});

describe("ModalFilters: formColumns + formWidth", () => {
	test("applies the formWidth size class to the dialog content", () => {
		const { getByTestId } = render(
			<ModalFilters
				filters={[FILTER_NODE]}
				filterValues={{}}
				onFilterChange={noop}
				onReset={noop}
				activeCount={0}
				formWidth="lg"
			/>,
		);
		fireEvent.click(getByTestId("table-filters-trigger"));
		const dialog = document.querySelector('[role="dialog"]');
		expect(dialog?.className).toContain("sm:max-w-2xl");
	});

	test("applies formColumns grid layout inside the modal body", () => {
		const { getByTestId } = render(
			<ModalFilters
				filters={[FILTER_NODE]}
				filterValues={{}}
				onFilterChange={noop}
				onReset={noop}
				activeCount={0}
				formColumns={3}
			/>,
		);
		fireEvent.click(getByTestId("table-filters-trigger"));
		const grid = document.querySelector(".grid");
		expect(grid?.className).toContain("sm:grid-cols-3");
	});
});
