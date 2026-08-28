import { describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { materialize } from "../inertia/materialize";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import type { FetchHandler } from "../testFixtures";
import { RepeaterCell, RepeaterForm } from "./repeaterField";

ensureBuiltinsRegistered();

type Item = Record<string, unknown>;

interface HarnessProps {
	initial: Item[] | null;
	options: {
		fields: { kind: string; name: string; options: Record<string, unknown>; meta: object }[];
		minItems?: number;
		maxItems?: number;
		defaultItems?: number;
	};
	onEmit?: (v: Item[] | null) => void;
}

function Harness({ initial, options, onEmit }: HarnessProps) {
	const [value, setValue] = useState<Item[] | null>(initial);
	return (
		<RepeaterForm
			name="items"
			value={value}
			onChange={(next) => {
				setValue(next);
				onEmit?.(next);
			}}
			options={options as unknown as HarnessProps["options"]}
		/>
	);
}

const titleField = { kind: "text", name: "title", options: {}, meta: {} };
const qtyField = { kind: "number", name: "qty", options: {}, meta: {} };

describe("RepeaterForm", () => {
	test("renders one card per item", () => {
		const { container } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		expect(container.querySelectorAll("[data-repeater-item]")).toHaveLength(2);
	});

	test("Add item appends an empty item", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getByRole } = render(
			<Harness
				initial={[{ title: "a" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		await user.click(getByRole("button", { name: "Add item" }));
		expect(emits.at(-1)).toEqual([{ title: "a" }, { title: null }]);
	});

	test("Add item disabled at maxItems", () => {
		const { getByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField], maxItems: 2 }}
			/>,
		);
		expect((getByRole("button", { name: "Add item" }) as HTMLButtonElement).disabled).toBe(
			true,
		);
	});

	test("Remove disabled when at minItems", () => {
		const { getAllByRole } = render(
			<Harness initial={[{ title: "a" }]} options={{ fields: [titleField], minItems: 1 }} />,
		);
		const remove = getAllByRole("button", { name: "Remove item" })[0] as HTMLButtonElement;
		expect(remove.disabled).toBe(true);
	});

	test("defaultItems seeds empty rows when the value is absent", () => {
		const { container } = render(
			<Harness initial={null} options={{ fields: [titleField], defaultItems: 2 }} />,
		);
		expect(container.querySelectorAll("[data-repeater-item]")).toHaveLength(2);
	});

	test("defaultItems does not override an explicit empty value", () => {
		const { container } = render(
			<Harness initial={[]} options={{ fields: [titleField], defaultItems: 2 }} />,
		);
		expect(container.querySelectorAll("[data-repeater-item]")).toHaveLength(0);
	});

	test("Remove drops the targeted item", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }, { title: "c" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const removeButtons = getAllByRole("button", { name: "Remove item" });
		await user.click(removeButtons[1] as HTMLElement);
		expect(emits.at(-1)).toEqual([{ title: "a" }, { title: "c" }]);
	});

	test("Move Up swaps with previous", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const moveUps = getAllByRole("button", { name: "Move up" });
		await user.click(moveUps[1] as HTMLElement);
		expect(emits.at(-1)).toEqual([{ title: "b" }, { title: "a" }]);
	});

	test("Move Up disabled at index 0", () => {
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		const moveUps = getAllByRole("button", { name: "Move up" });
		expect((moveUps[0] as HTMLButtonElement).disabled).toBe(true);
	});

	test("Move Down disabled at last index", () => {
		const { getAllByRole } = render(
			<Harness
				initial={[{ title: "a" }, { title: "b" }]}
				options={{ fields: [titleField] }}
			/>,
		);
		const moveDowns = getAllByRole("button", { name: "Move down" });
		const last = moveDowns[moveDowns.length - 1] as HTMLButtonElement;
		expect(last.disabled).toBe(true);
	});

	test("sub-field edit emits nested value at correct index", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[
					{ title: "a", qty: 1 },
					{ title: "b", qty: 2 },
				]}
				options={{ fields: [titleField, qtyField] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		const inputs = getAllByRole("textbox") as HTMLInputElement[];
		await user.clear(inputs[0] as HTMLElement);
		await user.type(inputs[0] as HTMLElement, "z");
		const last = emits.at(-1) as Item[];
		expect(last[0]).toEqual({ title: "z", qty: 1 });
		expect(last[1]).toEqual({ title: "b", qty: 2 });
	});

	test("two repeaters with a same-named field render distinct control/label ids", () => {
		const { container } = render(
			<>
				<RepeaterForm
					name="rulesA"
					value={[{ title: "a" }]}
					onChange={() => {}}
					options={{ fields: [titleField] }}
				/>
				<RepeaterForm
					name="rulesB"
					value={[{ title: "b" }]}
					onChange={() => {}}
					options={{ fields: [titleField] }}
				/>
			</>,
		);
		const inputs = container.querySelectorAll("input");
		const ids = Array.from(inputs).map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
		const labels = container.querySelectorAll("label[for]");
		for (const label of labels) {
			const targetId = label.getAttribute("for") as string;
			expect(container.querySelector(`#${CSS.escape(targetId)}`)).toBeTruthy();
		}
	});

	test("sub-field ids are scoped per item so labels target the right input", () => {
		const { container } = render(
			<Harness
				initial={[
					{ title: "a", qty: 1 },
					{ title: "b", qty: 2 },
				]}
				options={{ fields: [titleField, qtyField] }}
			/>,
		);
		const inputs = container.querySelectorAll("input");
		const ids = Array.from(inputs).map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
		const labels = container.querySelectorAll("label[for]");
		for (const label of labels) {
			const targetId = label.getAttribute("for") as string;
			expect(container.querySelector(`#${CSS.escape(targetId)}`)).toBeTruthy();
		}
	});
});

describe("RepeaterCell", () => {
	test("renders a summary for a non-empty array", () => {
		const { container } = render(<RepeaterCell value={[{ a: 1 }, { a: 2 }]} />);
		expect(container.textContent).toBe("2 items");
	});

	test("renders '1 item' singular", () => {
		const { container } = render(<RepeaterCell value={[{ a: 1 }]} />);
		expect(container.textContent).toBe("1 item");
	});

	test("renders nothing for null", () => {
		const { container } = render(<RepeaterCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("renders nothing for empty array", () => {
		const { container } = render(<RepeaterCell value={[]} />);
		expect(container.textContent).toBe("");
	});
});

describe("repeater via s.form integration", () => {
	test("s.repeater resolves the fields callback into StructureNode[] at build time", () => {
		const node = s.repeater({
			name: "items",
			fields: (sb) => [sb.text({ name: "title" })],
		});
		expect(node.kind).toBe("repeater");
		expect(node.name).toBe("items");
		const opts = node.options as { fields: { kind: string; name: string }[] };
		expect(opts.fields).toHaveLength(1);
		expect(opts.fields[0]?.kind).toBe("text");
		expect(opts.fields[0]?.name).toBe("title");
	});

	test("s.form + s.repeater renders end-to-end with label and items", async () => {
		const node = s.form(
			{
				query: async () => ({ items: [{ title: "Hello" }] }),
			},
			[
				s.repeater({
					name: "items",
					label: "Items",
					fields: (sb) => [sb.text({ name: "title" })],
				}),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Items");
	});
});

// A row's `initial` value must follow its own React identity (the stable
// per-row UUID key), never its current position — moveUp/moveDown swap two
// rows' positions without touching their data. A daterange sub-field with
// dependsOn is the observable proof: on mount its query is skipped only when
// depsKey already equals initialDepsKey (see daterangeDisabled.ts), so a row
// whose initial got swapped with its neighbor's spuriously looks "changed"
// immediately after a reorder and fires an unwanted refetch.
describe("repeater row initial follows the row through a reorder", () => {
	function reorderStructure(): StructureNode {
		return {
			kind: "form",
			name: "trip",
			options: {
				name: "trip",
				children: [
					{
						kind: "repeater",
						name: "legs",
						options: {
							name: "legs",
							fields: [
								{
									kind: "text",
									name: "season",
									options: { label: "Season" },
									meta: {},
								},
								{
									kind: "daterange",
									name: "stay",
									options: { label: "Stay", dependsOn: ["season"] },
									meta: {},
								},
							],
						},
						meta: {},
					},
				],
			},
			meta: {},
		} as StructureNode;
	}

	function rangesHandler(calls: Record<string, string>[]): FetchHandler {
		return async (req) => {
			const body = (await req.json()) as { deps?: Record<string, string> };
			calls.push(body.deps ?? {});
			return Response.json({ ranges: [] });
		};
	}

	test("swapping two rows does not trigger a spurious ranges refetch for either row", async () => {
		const calls: Record<string, string>[] = [];
		const materialized = materialize(reorderStructure(), {
			basePath: "/admin/collections",
			data: {
				trip: {
					legs: [
						{ season: "summer", stay: null },
						{ season: "winter", stay: null },
					],
				},
			},
		});
		const Wrap = wrap(rangesHandler(calls));
		const { container, getAllByRole } = render(<Wrap>{renderNode(materialized)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(2),
		);

		const moveDowns = getAllByRole("button", { name: "Move down" });
		await act(async () => {
			(moveDowns[0] as HTMLElement).click();
		});
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(2),
		);

		// Give any spurious effect-driven fetch a chance to fire before asserting none did.
		await act(async () => Promise.resolve());
		expect(calls).toEqual([]);
	});

	test("sanity: an actual season change after reorder does refetch with that row's own deps", async () => {
		const calls: Record<string, string>[] = [];
		const materialized = materialize(reorderStructure(), {
			basePath: "/admin/collections",
			data: {
				trip: {
					legs: [
						{ season: "summer", stay: null },
						{ season: "winter", stay: null },
					],
				},
			},
		});
		const Wrap = wrap(rangesHandler(calls));
		const user = userEvent.setup();
		const { container, getAllByRole } = render(<Wrap>{renderNode(materialized)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(2),
		);

		const moveDowns = getAllByRole("button", { name: "Move down" });
		await act(async () => {
			(moveDowns[0] as HTMLElement).click();
		});

		// Row that started as "summer" is now at index 1; editing its own
		// season field must key the refetch off ITS row, not the neighbor's.
		const seasonAtRow1 = container.querySelector(
			'[data-repeater-item="1"] input[name="season"]',
		) as HTMLInputElement;
		await user.clear(seasonAtRow1);
		await user.type(seasonAtRow1, "autumn");

		await waitFor(() => expect(calls.length).toBeGreaterThan(0));
		expect(calls.at(-1)).toEqual({ season: "autumn" });
	});
});
