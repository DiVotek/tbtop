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
