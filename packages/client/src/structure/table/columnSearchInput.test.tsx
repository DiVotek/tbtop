/**
 * ColumnSearchInput: each instance debounces independently — typing in one
 * column's box never resets or cross-fires another column's timer.
 */
import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TableColumn } from "../types";
import { ColumnSearchInput } from "./columnSearchInput";

const TITLE_COL: TableColumn = { name: "title", label: "Title", columnSearchable: true };
const SLUG_COL: TableColumn = { name: "slug", label: "Slug", columnSearchable: true };

describe("ColumnSearchInput: independent per-column debouncing", () => {
	test("typing in one column's input does not reset another's pending timer", async () => {
		const changes: Array<{ column: string; value: string }> = [];
		const onChange = (column: string, value: string) => {
			changes.push({ column, value });
		};
		const user = userEvent.setup({ delay: null });

		const { getByTestId } = render(
			<table>
				<tbody>
					<tr>
						<td>
							<ColumnSearchInput column={TITLE_COL} onChange={onChange} />
						</td>
						<td>
							<ColumnSearchInput column={SLUG_COL} onChange={onChange} />
						</td>
					</tr>
				</tbody>
			</table>,
		);

		const titleInput = getByTestId("table-col-search-title");
		const slugInput = getByTestId("table-col-search-slug");

		// Start typing in "title" at t=0.
		await act(async () => {
			await user.type(titleInput, "a");
		});

		// 200ms later (before title's 300ms fires), type in "slug". If the two
		// inputs shared one debounce instance, this would reset title's timer.
		const { promise: wait200, resolve: after200 } = Promise.withResolvers<void>();
		setTimeout(after200, 200);
		await act(async () => {
			await wait200;
		});
		await act(async () => {
			await user.type(slugInput, "b");
		});

		// 150ms later: title's original 300ms window (started at t=0) has
		// elapsed (t=200+150=350 > 300), so title should have already fired
		// independently of slug's still-pending timer.
		const { promise: wait150, resolve: after150 } = Promise.withResolvers<void>();
		setTimeout(after150, 150);
		await act(async () => {
			await wait150;
		});

		const titleChange = changes.find((c) => c.column === "title");
		expect(titleChange).toEqual({ column: "title", value: "a" });
		// slug's own 300ms window (started at t=200) has not yet elapsed at t=350.
		expect(changes.find((c) => c.column === "slug")).toBeUndefined();

		// After slug's own window elapses, it fires with its own value.
		const { promise: wait200b, resolve: after200b } = Promise.withResolvers<void>();
		setTimeout(after200b, 200);
		await act(async () => {
			await wait200b;
		});
		expect(changes.find((c) => c.column === "slug")).toEqual({ column: "slug", value: "b" });
	});

	test("seeds the uncontrolled input from defaultValue", () => {
		const { getByTestId } = render(
			<ColumnSearchInput column={TITLE_COL} defaultValue="preset" onChange={() => {}} />,
		);
		const input = getByTestId("table-col-search-title") as HTMLInputElement;
		expect(input.value).toBe("preset");
	});
});
