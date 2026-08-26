import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { FormController, StructureNode } from "./types";

const Wrap = wrap(() => new Response("{}"));

type Row = Record<string, unknown>;

function rowsOf(data: Record<string, unknown> | undefined, field: string): Row[] {
	const value = data?.[field];
	return Array.isArray(value) ? (value as Row[]) : [];
}

const CAR_OPTIONS = [
	{ value: "X", label: "Car X" },
	{ value: "Y", label: "Car Y" },
];
const PERIOD_OPTIONS = [{ value: "P", label: "Period P" }];
const TYPE_OPTIONS = [
	{ value: "A", label: "Type A" },
	{ value: "B", label: "Type B" },
];

/**
 * `car_id` depends on `type` and is hidden until `type` is set — the exact
 * shape the bug report described: a field that never mounts while hidden
 * must still be reset when its parent changes, because formBlock's
 * renderFormChild returns null for a hidden node and a per-field reset
 * effect never runs for a node that is never rendered.
 */
function typeCarPeriodFields(): StructureNode[] {
	return [
		{ kind: "select", name: "type", options: { options: TYPE_OPTIONS }, meta: {} },
		{
			kind: "select",
			name: "car_id",
			options: { options: CAR_OPTIONS, dependsOn: ["type"] },
			meta: { hidden: (ctx) => !ctx.data.type },
		},
		{
			kind: "select",
			name: "period_id",
			options: { options: PERIOD_OPTIONS, dependsOn: ["car_id"] },
			meta: {},
		},
	];
}

/** Renders a form, runs `edit` against the live controller, then returns the data an action sees on save. */
async function captureFormData(
	children: StructureNode[],
	edit: (form: FormController) => void,
): Promise<Record<string, unknown>> {
	let seenData: Record<string, unknown> | undefined;
	const node = s.form({ query: async () => ({ type: "A", car_id: "X", period_id: "P" }) }, [
		...children,
		s.action({
			name: "edit",
			handler: async (c) => {
				if (c.form) {
					edit(c.form);
				}
			},
		}),
		s.action({
			name: "save",
			handler: async (c) => {
				seenData = c.form?.data;
			},
		}),
	]);
	const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
	const editBtn = await findByTestId("action-edit");
	await act(async () => fireEvent.click(editBtn));
	const saveBtn = await findByTestId("action-save");
	await act(async () => fireEvent.click(saveBtn));
	return seenData ?? {};
}

describe("useDependentResets", () => {
	test("changing a grandparent clears a hidden dependent field and its own dependent in one pass", async () => {
		const data = await captureFormData(typeCarPeriodFields(), (form) => form.set("type", "B"));
		expect(data.car_id).toBe(null);
		expect(data.period_id).toBe(null);
		expect(data.type).toBe("B");
	});

	test("hydration: loading a record at (parent, child) does not reset the child", async () => {
		let seenData: Record<string, unknown> | undefined;
		const node = s.form({ query: async () => ({ type: "A", car_id: "X", period_id: "P" }) }, [
			...typeCarPeriodFields(),
			s.action({
				name: "save",
				handler: async (c) => {
					seenData = c.form?.data;
				},
			}),
		]);
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const saveBtn = await findByTestId("action-save");
		await act(async () => fireEvent.click(saveBtn));
		expect(seenData?.car_id).toBe("X");
		expect(seenData?.period_id).toBe("P");
	});

	test("keepValue keeps the dependent field's value when its parent changes", async () => {
		const fields: StructureNode[] = [
			{ kind: "select", name: "type", options: { options: TYPE_OPTIONS }, meta: {} },
			{
				kind: "select",
				name: "car_id",
				options: { options: CAR_OPTIONS, dependsOn: ["type"], keepValue: true },
				meta: { hidden: (ctx) => !ctx.data.type },
			},
		];
		const data = await captureFormData(fields, (form) => form.set("type", "B"));
		expect(data.car_id).toBe("X");
	});

	// Regression: depsKeyFor must resolve a locale-scoped dependency the same
	// way useFieldDependencies does (readDeps -> readOne), which reads
	// data.title.en out of the locale map for a translatable parent declared
	// per locale (dependsOn(["title.en"])). A plain scalarToString(scope[name])
	// read always sees "" for "title.en" (there is no such flat key), so the
	// dependent field's key never changes and it never resets.
	test("a locale-scoped parent (title.en) still resets its dependent field when that locale changes", async () => {
		const fields: StructureNode[] = [
			{
				kind: "text",
				name: "title",
				options: { translatable: true },
				meta: {},
			},
			{
				kind: "select",
				name: "preview",
				options: { options: CAR_OPTIONS, dependsOn: ["title.en"] },
				meta: {},
			},
		];
		let seenData: Record<string, unknown> | undefined;
		const node = s.form(
			{
				query: async () => ({
					title: { en: "Hello", uk: "" },
					preview: "X",
				}),
			},
			[
				...fields,
				s.action({
					name: "edit",
					handler: async (c) => {
						c.form?.set("title", { en: "Goodbye", uk: "" });
					},
				}),
				s.action({
					name: "save",
					handler: async (c) => {
						seenData = c.form?.data;
					},
				}),
			],
		);
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const editBtn = await findByTestId("action-edit");
		await act(async () => fireEvent.click(editBtn));
		const saveBtn = await findByTestId("action-save");
		await act(async () => fireEvent.click(saveBtn));
		expect(seenData?.preview).toBe(null);
	});
});

describe("useDependentResets: repeater rows", () => {
	test("changing one row's parent resets only that row's dependent sub-field", async () => {
		const subFields: StructureNode[] = [
			{ kind: "select", name: "type", options: { options: TYPE_OPTIONS }, meta: {} },
			{
				kind: "select",
				name: "car_id",
				options: { options: CAR_OPTIONS, dependsOn: ["type"] },
				meta: {},
			},
		];
		const repeater: StructureNode = {
			kind: "repeater",
			name: "items",
			options: { fields: subFields },
			meta: {},
		};
		let seenData: Record<string, unknown> | undefined;
		const node = s.form(
			{
				query: async () => ({
					items: [
						{ type: "A", car_id: "X" },
						{ type: "A", car_id: "X" },
					],
				}),
			},
			[
				repeater,
				s.action({
					name: "edit",
					handler: async (c) => {
						const items = rowsOf(c.form?.data, "items");
						const nextItems = items.map((row, i) =>
							i === 0 ? { ...row, type: "B" } : row,
						);
						c.form?.set("items", nextItems);
					},
				}),
				s.action({
					name: "save",
					handler: async (c) => {
						seenData = c.form?.data;
					},
				}),
			],
		);
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const editBtn = await findByTestId("action-edit");
		await act(async () => fireEvent.click(editBtn));
		const saveBtn = await findByTestId("action-save");
		await act(async () => fireEvent.click(saveBtn));
		const items = rowsOf(seenData, "items");
		expect(items[0]?.car_id).toBe(null);
		expect(items[1]?.car_id).toBe("X");
	});
});

/**
 * Row identity, not index, is what a repeater row shift preserves — remove
 * or move a row through the real RepeaterForm UI (not a synthetic c.form.set
 * on the whole array) so the row's rendered DOM node and its dependent
 * sub-field's value travel with it, the way a user's edit actually does.
 */
function typeCarRepeaterNode(items: Record<string, unknown>[]): StructureNode {
	const subFields: StructureNode[] = [
		{ kind: "text", name: "type", options: {}, meta: {} },
		{
			kind: "text",
			name: "car_id",
			options: { dependsOn: ["type"] },
			meta: {},
		},
	];
	return s.form({ query: async () => ({ items }) }, [
		{ kind: "repeater", name: "items", options: { fields: subFields }, meta: {} },
	]);
}

function rowInput(container: HTMLElement, index: number, field: string): HTMLInputElement {
	const row = container.querySelector(`[data-field-name="items.${index}.${field}"] input`);
	if (!row) {
		throw new Error(`no input for items.${index}.${field}`);
	}
	return row as HTMLInputElement;
}

describe("useDependentResets: repeater row identity survives a shift", () => {
	test("removing row 0 keeps former row 1's dependent value, addressed at its new index", async () => {
		const node = typeCarRepeaterNode([
			{ type: "A", car_id: "X" },
			{ type: "A", car_id: "Y" },
		]);
		const { container, findAllByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(rowInput(container, 1, "car_id").value).toBe("Y"));

		const removeButtons = await findAllByRole("button", { name: "Remove item" });
		await act(async () => fireEvent.click(removeButtons[0] as HTMLButtonElement));

		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]")).toHaveLength(1),
		);
		expect(rowInput(container, 0, "car_id").value).toBe("Y");
	});

	test("moving row 0 down keeps both rows' dependent values", async () => {
		const node = typeCarRepeaterNode([
			{ type: "A", car_id: "X" },
			{ type: "B", car_id: "Y" },
		]);
		const { container, findAllByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(rowInput(container, 1, "car_id").value).toBe("Y"));

		const moveDown = await findAllByRole("button", { name: "Move down" });
		await act(async () => fireEvent.click(moveDown[0] as HTMLButtonElement));

		await waitFor(() => expect(rowInput(container, 0, "type").value).toBe("B"));
		expect(rowInput(container, 0, "car_id").value).toBe("Y");
		expect(rowInput(container, 1, "car_id").value).toBe("X");
	});

	test("editing row 0's parent in place resets only row 0's dependent, row 1 untouched", async () => {
		const user = userEvent.setup();
		const node = typeCarRepeaterNode([
			{ type: "A", car_id: "X" },
			{ type: "A", car_id: "Y" },
		]);
		const { container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(rowInput(container, 1, "car_id").value).toBe("Y"));

		await user.clear(rowInput(container, 0, "type"));
		await user.type(rowInput(container, 0, "type"), "B");

		await waitFor(() => expect(rowInput(container, 0, "car_id").value).toBe(""));
		expect(rowInput(container, 1, "car_id").value).toBe("Y");
	});
});

describe("useDependentResets: settles synchronously with the triggering change", () => {
	test("the cascade is visible in the very next read of form data, no extra tick needed", async () => {
		const data = await captureFormData(typeCarPeriodFields(), (form) => form.set("type", "B"));
		await waitFor(() => expect(data.car_id).toBe(null));
	});
});

/**
 * Multi-step repro harness: each `set(field, value)` clicks a dedicated
 * action whose handler applies exactly that one controller.set call, then
 * `read()` clicks a save action and returns the resulting c.form.data. Real
 * FormBlock/FormController wiring throughout — every step observes the
 * live controller a real click would see, not a stale snapshot.
 *
 * `commitBaseline()` mirrors materializeActions.ts's serverHandler: after
 * ANY server action that reads `form` succeeds (not just the form's own
 * save), the client commits the live data as the new baseline —
 * `ctx.form?.reset(ctx.form.data)` — so a later failed submit's rollback
 * doesn't erase this action's effect. That reset call produces a NEW
 * ctrl.initial reference holding the current (mid-edit) values — content
 * changes, but so does identity — which is the lever a real page has to
 * retrigger useDependentResets's own initial-reconciliation branch without
 * an actual Inertia round trip.
 */
function multiStepHarness(fields: StructureNode[], initial: Record<string, unknown>) {
	let seenData: Record<string, unknown> | undefined;
	const steps: { field: string; value: unknown }[] = [];
	function makeNode(): StructureNode {
		return s.form({ query: async () => ({ ...initial }) }, [
			...fields,
			s.action({
				name: "apply",
				handler: async (c) => {
					const step = steps.at(-1);
					if (step) {
						c.form?.set(step.field, step.value);
					}
				},
			}),
			s.action({
				name: "read",
				handler: async (c) => {
					seenData = c.form?.data;
				},
			}),
			s.action({
				name: "commitBaseline",
				handler: async (c) => {
					if (c.form) {
						c.form.reset(c.form.data);
					}
				},
			}),
		]);
	}
	const rendered = render(<Wrap>{renderNode(makeNode())}</Wrap>);
	return {
		set: async (field: string, value: unknown) => {
			steps.push({ field, value });
			const applyBtn = await rendered.findByTestId("action-apply");
			await act(async () => fireEvent.click(applyBtn));
		},
		read: async (): Promise<Record<string, unknown>> => {
			const readBtn = await rendered.findByTestId("action-read");
			await act(async () => fireEvent.click(readBtn));
			return seenData ?? {};
		},
		commitBaseline: async (): Promise<void> => {
			const commitBtn = await rendered.findByTestId("action-commitBaseline");
			await act(async () => fireEvent.click(commitBtn));
		},
	};
}

describe("useDependentResets: multi-step cascade does not stop resetting after the first change", () => {
	// Reproduces a real-browser sequence reported against the type -> car_id ->
	// period_id chain: the reset fired correctly once, then went silent for
	// every later parent change on the same field, leaving a stale dependent
	// value in the submitted data. The initial record's car_id ("sedan-1") is
	// deliberately re-picked at step 4 (not a fresh value) — that is the exact
	// condition that must still reset period_id: only the CHILD's own value
	// differing from the record's own initial should matter, not whether the
	// parent's resolved key happens to equal the record's own parent key.
	const carOptions = [
		{ value: "sedan-1", label: "Sedan 1" },
		{ value: "suv-1", label: "SUV 1" },
	];
	const periodOptions = [
		{ value: "week", label: "1 week" },
		{ value: "month", label: "1 month" },
	];
	function fields(): StructureNode[] {
		return [
			{ kind: "select", name: "type", options: { options: TYPE_OPTIONS }, meta: {} },
			{
				kind: "select",
				name: "car_id",
				options: { options: carOptions, dependsOn: ["type"] },
				meta: { hidden: (ctx) => ctx.data.car_id !== "" && ctx.data.car_id != null },
			},
			{
				kind: "select",
				name: "period_id",
				options: { options: periodOptions, dependsOn: ["car_id"] },
				meta: {},
			},
		];
	}

	test("period_id keeps resetting on every later car_id/type change, not just the first", async () => {
		const h = multiStepHarness(fields(), { type: "A", car_id: "sedan-1", period_id: "week" });

		// 1. type A -> B: car_id and period_id both reset.
		await h.set("type", "B");

		// 2. user picks period_id manually while car_id is still empty.
		await h.set("period_id", "month");

		// 3. type B -> A: car_id stays empty -> empty (key unchanged), so
		// period_id's own parent (car_id) never actually changed value —
		// period_id is allowed to survive this step.
		await h.set("type", "A");

		// An unrelated server action (anything else on the page bound to the
		// form) succeeds here and commits the live values as the new
		// baseline — a real page has many such actions (autosave, a sibling
		// widget's own action) that read the form and, per
		// materializeActions.ts's serverHandler, commit on success.
		await h.commitBaseline();

		// 4. user picks car_id back to the record's own initial value
		// ("sedan-1"). period_id's parent goes empty -> "sedan-1", a real
		// change, and period_id's live value ("month") differs from its own
		// initial ("week") — it must reset regardless of car_id landing back
		// on its initial value.
		await h.set("car_id", "sedan-1");
		let data = await h.read();
		expect(data.period_id).toBe(null);

		// 5. type A -> B again: car_id resets a second time, proving the
		// mechanism did not go permanently silent after step 1's reset.
		await h.set("period_id", "month");
		await h.set("type", "B");
		data = await h.read();
		expect(data.car_id).toBe(null);
		expect(data.period_id).toBe(null);
	});
});
