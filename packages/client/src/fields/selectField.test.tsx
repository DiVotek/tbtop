import { describe, expect, mock, spyOn, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
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

	test("Select multi-mode emits string[] when removing a chip", async () => {
		// Rule: deselecting a chip removes the value from the string[].
		// (Selecting via popup is covered by the browser smoke pass — the popup
		// is portalled and not reliably interactable in happy-dom.)
		const captured: (string | string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<SelectForm
				name="tags"
				value={["draft"]}
				onChange={(next) => {
					captured.push(next);
				}}
				options={{ options: STATIC_CHOICES, multiple: true }}
			/>,
		);
		const removeBtn = container.querySelector(
			'[data-testid="chip-draft"] button[aria-label^="Remove"]',
		) as HTMLElement;
		expect(removeBtn).not.toBeNull();
		await user.click(removeBtn);
		expect(captured.at(-1)).toEqual([]);
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
		const label = container.querySelector('[data-testid="select-label-author_id"]');
		expect(label?.textContent).toBe("Alice");
	});

	test("static multi select renders a chip for the coerced int value", () => {
		// Rule: int record values coerce to string before option matching.
		// The chip for "1" should display "Alice" (matched from wire options).
		const { container } = render(
			<SelectForm
				name="author_ids"
				value={asValue([1])}
				onChange={() => {}}
				options={{ options: INT_CHOICES, multiple: true }}
			/>,
		);
		const chip = container.querySelector('[data-testid="chip-1"]');
		expect(chip?.textContent).toContain("Alice");
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
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("Carol");
		});
		expect(onLoad).toHaveBeenCalledWith(expect.anything(), "42");
	});

	test("Select async does not re-resolve a label the dropdown already listed", async () => {
		// Rule: selecting a row the dropdown just showed reuses its label. Re-resolving
		// it round-trips to the server and blanks the control through a skeleton.
		// (The popup is portalled and not interactable in happy-dom, so the selection
		// is driven the way the form does it — by re-rendering with the new value.)
		const onLoad = mock(
			async (_c: unknown, value: string): Promise<UserRow> => ({
				id: value,
				name: `Resolved ${value}`,
			}),
		);
		const query = mock(async (): Promise<UserRow[]> => [{ id: "7", name: "Dave" }]);
		const opts = {
			query,
			onLoad,
			optionLabel: (r: unknown) => (r as UserRow).name,
			optionValue: (r: unknown) => (r as UserRow).id,
		};
		const Wrap = wrap(NO_RESP);
		const { container, rerender } = render(
			<Wrap>
				<SelectForm name="authorId" value={null} onChange={() => {}} options={opts} />
			</Wrap>,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-testid="select-authorId"]')).not.toBeNull();
		});

		rerender(
			<Wrap>
				<SelectForm name="authorId" value="7" onChange={() => {}} options={opts} />
			</Wrap>,
		);

		await waitFor(() => {
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("Dave");
		});
		expect(onLoad).not.toHaveBeenCalled();
		expect(container.querySelector('[data-testid="form-skeleton"]')).toBeNull();
	});

	test("Select async resolves the label for an int value", async () => {
		const onLoad = mock(
			async (_c: unknown, value: string): Promise<UserRow> => ({
				id: value,
				name: "Carol",
			}),
		);
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		// Records arrive with an int FK (author_id: 42) though the prop type says string.
		const intValue = 42 as unknown as Parameters<typeof SelectForm>[0]["value"];
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value={intValue}
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
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("Carol");
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

	test("Select async multi keeps resolved chips visible while the next load is in flight", async () => {
		const gate = Promise.withResolvers<UserRow[]>();
		let loads = 0;
		const onLoad = mock(async (_c: unknown, values: string[]): Promise<UserRow[]> => {
			loads += 1;
			return loads === 1 ? values.map((id) => ({ id, name: `User ${id}` })) : gate.promise;
		});
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const bag = {
			query,
			onLoad,
			optionLabel: (r: unknown) => (r as UserRow).name,
			optionValue: (r: unknown) => (r as UserRow).id,
			multiple: true as const,
		};
		const { container, rerender } = render(
			<Wrap>
				<SelectForm name="authorIds" value={["1", "2"]} onChange={() => {}} options={bag} />
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-1"]')).not.toBeNull(),
		);

		rerender(
			<Wrap>
				<SelectForm
					name="authorIds"
					value={["1", "2", "3"]}
					onChange={() => {}}
					options={bag}
				/>
			</Wrap>,
		);

		await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(2));
		expect(container.querySelector('[data-testid="chip-1"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="chip-2"]')).not.toBeNull();

		act(() =>
			gate.resolve([
				{ id: "1", name: "User 1" },
				{ id: "2", name: "User 2" },
				{ id: "3", name: "User 3" },
			]),
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-3"]')).not.toBeNull(),
		);
	});

	test("Select async multi lets a fresh load overwrite a cached label", async () => {
		let loads = 0;
		const onLoad = mock(async (_c: unknown, values: string[]): Promise<UserRow[]> => {
			loads += 1;
			return values.map((id) => ({ id, name: loads === 1 ? `User ${id}` : `Renamed ${id}` }));
		});
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const bag = {
			query,
			onLoad,
			optionLabel: (r: unknown) => (r as UserRow).name,
			optionValue: (r: unknown) => (r as UserRow).id,
			multiple: true as const,
		};
		const { container, rerender } = render(
			<Wrap>
				<SelectForm name="authorIds" value={["1"]} onChange={() => {}} options={bag} />
			</Wrap>,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-1"]')?.textContent).toContain(
				"User 1",
			),
		);

		rerender(
			<Wrap>
				<SelectForm name="authorIds" value={["1", "2"]} onChange={() => {}} options={bag} />
			</Wrap>,
		);

		await waitFor(() =>
			expect(container.querySelector('[data-testid="chip-1"]')?.textContent).toContain(
				"Renamed 1",
			),
		);
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
				expect(container.querySelector('[data-testid="select-authorId"]')).not.toBeNull();
			});
			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/authorId/);
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("42");
		} finally {
			warnSpy.mockRestore();
		}
	});

	test("Select async keeps the control mounted while a refetch is in flight", async () => {
		// Rule: only the first load may show a skeleton. A later refetch that
		// unmounts the control drops the input and the text being typed with it.
		const user = userEvent.setup();
		let resolveSecond: ((rows: UserRow[]) => void) | undefined;
		let call = 0;
		const query = mock(async (_c: unknown, _s: string): Promise<UserRow[]> => {
			call += 1;
			if (call === 1) {
				return [{ id: "1", name: "Alice" }];
			}
			return new Promise<UserRow[]>((res) => {
				resolveSecond = res;
			});
		});
		const Wrap = wrap(NO_RESP);
		const { container, getByTestId } = render(
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
		await waitFor(() => expect(getByTestId("select-search-authorId")).toBeTruthy());

		await user.type(getByTestId("select-search-authorId"), "Bo");
		await waitFor(() => expect(query.mock.calls.length).toBeGreaterThan(1));

		// The second query is still pending here — the input must survive it.
		expect(container.querySelector('[data-testid="form-skeleton"]')).toBeNull();
		expect(container.querySelector('[data-testid="select-search-authorId"]')).not.toBeNull();
		resolveSecond?.([]);
	});

	test("Select async survives a failed lookup and retries on the next keystroke", async () => {
		// Rule: once the control has rendered, a rejected query keeps the input.
		// Unmounting it removes the only way to change the search, so the field
		// would stay broken until a page reload.
		const user = userEvent.setup();
		let call = 0;
		const query = mock(async (_c: unknown, _s: string): Promise<UserRow[]> => {
			call += 1;
			if (call === 2) {
				throw new Error("network hiccup");
			}
			return [{ id: "1", name: "Alice" }];
		});
		const Wrap = wrap(NO_RESP);
		const { getByTestId } = render(
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
		await waitFor(() => expect(getByTestId("select-search-authorId")).toBeTruthy());

		await user.type(getByTestId("select-search-authorId"), "Bo");
		await waitFor(() => expect(call).toBe(2));

		// The input survives the failure, so typing can still drive a retry.
		expect(getByTestId("select-search-authorId")).toBeTruthy();
		await user.type(getByTestId("select-search-authorId"), "b");

		await waitFor(() => expect(query.mock.calls.at(-1)?.[1]).toBe("Bob"));
	});

	test("Select async shows the placeholder for an empty stored value", async () => {
		// Rule: "" is nothing selected, not an option labelled "". Treating it as a
		// selection suppresses the placeholder and renders a blank overlay.
		const query = mock(async (): Promise<UserRow[]> => []);
		const Wrap = wrap(NO_RESP);
		const emptyValue = "" as Parameters<typeof SelectForm>[0]["value"];
		const { container } = render(
			<Wrap>
				<SelectForm
					name="authorId"
					value={emptyValue}
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
			expect(
				container.querySelector('[data-testid="select-search-authorId"]'),
			).not.toBeNull();
		});

		const input = container.querySelector(
			'[data-testid="select-search-authorId"]',
		) as HTMLInputElement;
		expect(input.getAttribute("placeholder")).toBe("—");
		expect(container.querySelector('[data-testid="select-label-authorId"]')).toBeNull();
	});

	test("Select async sends the typed text to the query", async () => {
		// Rule: the search string reaches the endpoint, so rows past the server's
		// page limit stay reachable. A hardcoded "" pins the list to page one.
		const user = userEvent.setup();
		const query = mock(
			async (_c: unknown, _s: string): Promise<UserRow[]> => [{ id: "1", name: "Alice" }],
		);
		const Wrap = wrap(NO_RESP);
		const { getByTestId } = render(
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
		await waitFor(() => expect(query).toHaveBeenCalled());

		await user.type(getByTestId("select-search-authorId"), "Bob");

		await waitFor(() => {
			expect(query.mock.calls.some((c) => c[1] === "Bob")).toBe(true);
		});
	});

	test("Select async keeps the selected label while the search excludes it", async () => {
		// Rule: onLoad resolves the label; a search result that omits the value
		// must not blank it back to the raw id.
		const user = userEvent.setup();
		const onLoad = mock(
			async (_c: unknown, value: string): Promise<UserRow> => ({
				id: value,
				name: "Carol",
			}),
		);
		const query = mock(
			async (_c: unknown, _s: string): Promise<UserRow[]> => [{ id: "9", name: "Zed" }],
		);
		const Wrap = wrap(NO_RESP);
		const { container, getByTestId } = render(
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
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("Carol");
		});

		await user.type(getByTestId("select-search-authorId"), "Zed");
		await waitFor(() => {
			expect(query.mock.calls.some((c) => c[1] === "Zed")).toBe(true);
		});
		// Backspace, not clear(): clear() sets .value directly and the controlled
		// input never sees the event.
		await user.type(getByTestId("select-search-authorId"), "{Backspace>3/}");

		await waitFor(() => {
			expect(
				container.querySelector('[data-testid="select-label-authorId"]')?.textContent,
			).toContain("Carol");
		});
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
