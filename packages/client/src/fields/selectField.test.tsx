import { describe, expect, mock, spyOn, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SelectCell, SelectForm } from "./selectField";

const NO_RESP = () => new Response("{}");

const STATIC_CHOICES = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
];

describe("Select field — static mode", () => {
	test("Select renders a Radix Select trigger", async () => {
		const node = s.form({ query: async () => ({ status: "draft" }) }, [
			s.select({ name: "status", options: STATIC_CHOICES }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(container.querySelector('[data-slot="select-trigger"]')).not.toBeNull();
	});

	test("Select single mode trigger displays the label for the current value", () => {
		const { container } = render(
			<SelectForm
				name="status"
				value="draft"
				onChange={() => {}}
				options={{ options: STATIC_CHOICES }}
			/>,
		);
		const trigger = container.querySelector('[data-slot="select-trigger"]');
		expect(trigger?.textContent).toContain("Draft");
	});

	test("Select multi-mode emits string[] when toggling options", async () => {
		const captured: (string | string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<SelectForm
				name="tags"
				value={[]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: STATIC_CHOICES, multiple: true }}
			/>,
		);
		const buttons = container.querySelectorAll('[role="option"]');
		expect(buttons.length).toBe(2);
		await user.click(buttons[0] as HTMLElement);
		expect(captured.at(-1)).toEqual(["draft"]);
	});

	test("SelectCell renders the label for a matching static option", () => {
		const { container } = render(
			<SelectCell value="draft" options={{ options: STATIC_CHOICES }} />,
		);
		expect(container.textContent).toBe("Draft");
	});

	test("SelectCell renders comma-joined labels for an array value", () => {
		const { container } = render(
			<SelectCell value={["draft", "published"]} options={{ options: STATIC_CHOICES }} />,
		);
		expect(container.textContent).toBe("Draft, Published");
	});

	test("SelectCell renders nothing for a null value", () => {
		const { container } = render(
			<SelectCell value={null} options={{ options: STATIC_CHOICES }} />,
		);
		expect(container.textContent).toBe("");
	});
});

describe("Select field — int record values match string wire options", () => {
	// Records arrive with int FKs (author_id: 1) while options are
	// string-cast on the wire ("1"); controls must coerce before matching.
	const INT_CHOICES = [
		{ value: "1", label: "Alice" },
		{ value: "2", label: "Bob" },
	];
	const asValue = (v: unknown) => v as Parameters<typeof SelectForm>[0]["value"];

	test("static single select shows the label for an int value", () => {
		const { container } = render(
			<SelectForm
				name="author_id"
				value={asValue(1)}
				onChange={() => {}}
				options={{ options: INT_CHOICES }}
			/>,
		);
		const trigger = container.querySelector('[data-slot="select-trigger"]');
		expect(trigger?.textContent).toContain("Alice");
	});

	test("searchable static select shows the label for an int value", () => {
		const { container } = render(
			<SelectForm
				name="author_id"
				value={asValue(1)}
				onChange={() => {}}
				options={{ options: INT_CHOICES, searchable: true }}
			/>,
		);
		const input = container.querySelector('[data-testid="select-search-author_id"]');
		expect(input?.getAttribute("placeholder")).toBe("Alice");
	});

	test("static multi select marks int array values as selected", () => {
		const { container } = render(
			<SelectForm
				name="author_ids"
				value={asValue([1])}
				onChange={() => {}}
				options={{ options: INT_CHOICES, multiple: true }}
			/>,
		);
		const selected = container.querySelector('[role="option"][aria-selected="true"]');
		expect(selected?.textContent).toContain("Alice");
	});

	test("SelectCell renders the label for an int value", () => {
		const { container } = render(
			<SelectCell value={asValue(1) as never} options={{ options: INT_CHOICES }} />,
		);
		expect(container.textContent).toBe("Alice");
	});
});

interface UserRow {
	id: string;
	name: string;
}

describe("Select field — async mode", () => {
	test("Select async renders the form skeleton while query is pending", () => {
		const Wrap = wrap(NO_RESP);
		const query = () => new Promise<UserRow[]>(() => {});
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value={null}
					onChange={() => {}}
					options={{
						query,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
					}}
				/>
			</Wrap>,
		);
		expect(container.querySelector('[data-testid="form-skeleton"]')).not.toBeNull();
	});

	test("Select async with onLoad resolves the initial value's label", async () => {
		const onLoad = mock(
			async (_c: unknown, value: string): Promise<UserRow> => ({
				id: value,
				name: "Carol",
			}),
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value="42"
					onChange={() => {}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-slot="select-trigger"]')?.textContent).toContain(
				"Carol",
			);
		});
		expect(onLoad).toHaveBeenCalledWith(expect.anything(), "42");
	});

	test("Select async multi chip × button removes a value not in current search rows", async () => {
		const user = userEvent.setup();
		const captured: (string | string[] | null)[] = [];
		const onLoad = mock(
			async (_c: unknown, values: string[]): Promise<UserRow[]> =>
				values.map((id) => ({ id, name: `User ${id}` })),
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorIds"
					value={["1", "2"]}
					onChange={(next) => {
						captured.push(next);
					}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
						multiple: true,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-1"]')).not.toBeNull(),
		);
		const removeBtn = container.querySelector(
			'[data-testid="chip-1"] button[aria-label^="Remove"]',
		);
		expect(removeBtn).not.toBeNull();
		await user.click(removeBtn as HTMLElement);
		expect(captured.at(-1)).toEqual(["2"]);
	});

	test("Select async multi onLoad is called once with the full value array", async () => {
		const onLoad = mock(
			async (_c: unknown, values: string[]): Promise<UserRow[]> =>
				values.map((id) => ({ id, name: `User ${id}` })),
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		render(
			<Wrap>
				<SelectForm
					name="authorIds"
					value={["1", "2", "3"]}
					onChange={() => {}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
						multiple: true,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
		expect(onLoad).toHaveBeenCalledWith(expect.anything(), ["1", "2", "3"]);
	});

	test("Select async multi onLoad returning partial rows hides unresolved values", async () => {
		const onLoad = mock(
			async (_c: unknown, _values: string[]): Promise<UserRow[]> => [
				{ id: "1", name: "Alice" },
				{ id: "3", name: "Carol" },
			],
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorIds"
					value={["1", "2", "3"]}
					onChange={() => {}}
					options={{
						query,
						onLoad,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
						multiple: true,
					}}
				/>
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-1"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-testid="chip-1"]')?.textContent).toContain("Alice");
		expect(container.querySelector('[data-testid="chip-2"]')).toBeNull();
		expect(container.querySelector('[data-testid="chip-3"]')?.textContent).toContain("Carol");
	});

	test("Select async missing onLoad warns and displays raw value", async () => {
		const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
		try {
			const query = mock(async (): Promise<UserRow[]> => []);
			const Wrap = wrap(NO_RESP);
			const { container } = render(
				<Wrap>
					<SelectForm
						name="authorId"
						value="42"
						onChange={() => {}}
						options={{
							query,
							optionLabel: (r) => (r as UserRow).name,
							optionValue: (r) => (r as UserRow).id,
						}}
					/>
				</Wrap>,
			);
			await waitFor(() => {
				expect(container.querySelector('[data-slot="select-trigger"]')).not.toBeNull();
			});
			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/authorId/);
			expect(container.querySelector('[data-slot="select-trigger"]')?.textContent).toContain(
				"42",
			);
		} finally {
			warnSpy.mockRestore();
		}
	});

	test("Select async custom loading override renders instead of default skeleton", () => {
		const query = () => new Promise<UserRow[]>(() => {});
		const Wrap = wrap(NO_RESP);
		const { container, queryByTestId } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value={null}
					onChange={() => {}}
					options={{
						query,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
						loading: <div data-testid="custom-loader">loading</div>,
					}}
				/>
			</Wrap>,
		);
		expect(queryByTestId("custom-loader")).not.toBeNull();
		expect(container.querySelector('[data-testid="form-skeleton"]')).toBeNull();
	});

	test("Select async error override is called with the rejected error", async () => {
		const query = mock(async (): Promise<UserRow[]> => {
			throw new Error("boom");
		});
		const Wrap = wrap(NO_RESP);
		const { findByTestId } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value={null}
					onChange={() => {}}
					options={{
						query,
						optionLabel: (r) => (r as UserRow).name,
						optionValue: (r) => (r as UserRow).id,
						error: (err) => <div data-testid="custom-error">Failed: {err.message}</div>,
					}}
				/>
			</Wrap>,
		);
		const node = await findByTestId("custom-error");
		expect(node.textContent).toBe("Failed: boom");
	});
});
