import { describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { FormController } from "../structure/types";
import type { DependencyConfig, DependencyState } from "./fieldDependencies";
import { useFieldDependencies } from "./fieldDependencies";
import { RelationForm, type RelationOptionsBag } from "./relationField";

ensureBuiltinsRegistered();

interface Row {
	value: string;
	label: string;
}
const ROWS: Row[] = [
	{ value: "1", label: "Kyiv" },
	{ value: "2", label: "Lviv" },
];

const Wrap = wrap(() => new Response("{}"));

function optionLabel(row: unknown): string {
	const r = row as Row;
	return r.label;
}
function optionValue(row: unknown): string {
	const r = row as Row;
	return r.value;
}
async function onLoad(_ctx: unknown, value: string): Promise<Row> {
	const found = ROWS.find((r) => r.value === value);
	if (!found) {
		throw new Error("not found");
	}
	return found;
}

// ── Hook unit tests ───────────────────────────────────────────────────────────

interface HookCapture {
	states: DependencyState[];
	ctrls: FormController[];
}

function mountHook(
	config: DependencyConfig,
	initial: Record<string, unknown>,
	childName: string,
): HookCapture {
	const cap: HookCapture = { states: [], ctrls: [] };
	function Outer() {
		const ctrl = useFormController({ initial });
		cap.ctrls.push(ctrl);
		return (
			<FormControllerProvider value={ctrl}>
				<Inner ctrl={ctrl} />
			</FormControllerProvider>
		);
	}
	function Inner({ ctrl }: { ctrl: FormController }) {
		cap.states.push(
			useFieldDependencies({
				config,
				value: ctrl.data[childName],
				onChange: (v) => ctrl.set(childName, v),
			}),
		);
		return null;
	}
	render(<Outer />);
	return cap;
}

describe("useFieldDependencies", () => {
	test("parent unfilled → not ready and disabled by default", () => {
		const { states } = mountHook(
			{ dependsOn: ["country_id"] },
			{ country_id: null, city_id: null },
			"city_id",
		);
		const s = states.at(-1) as DependencyState;
		expect(s.hasDeps).toBe(true);
		expect(s.ready).toBe(false);
		expect(s.disabledByParent).toBe(true);
		expect(s.deps).toEqual({});
	});

	test("parent filled → ready, deps carry the parent value, not disabled", () => {
		const cap = mountHook(
			{ dependsOn: ["country_id"] },
			{ country_id: null, city_id: null },
			"city_id",
		);
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "5"));
		const s = cap.states.at(-1) as DependencyState;
		expect(s.ready).toBe(true);
		expect(s.deps).toEqual({ country_id: "5" });
		expect(s.disabledByParent).toBe(false);
	});

	test("whenParentEmpty 'empty' → enabled even when parent unfilled", () => {
		const { states } = mountHook(
			{ dependsOn: ["country_id"], whenParentEmpty: "empty" },
			{ country_id: null, city_id: null },
			"city_id",
		);
		const s = states.at(-1) as DependencyState;
		expect(s.ready).toBe(false);
		expect(s.disabledByParent).toBe(false);
	});

	test("changing the parent clears this field (cascade reset)", () => {
		const cap = mountHook(
			{ dependsOn: ["country_id"] },
			{ country_id: "5", city_id: "2" },
			"city_id",
		);
		expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe("2");
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "9"));
		expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe(null);
	});

	test("keepValue retains this field when the parent changes", () => {
		const cap = mountHook(
			{ dependsOn: ["country_id"], keepValue: true },
			{ country_id: "5", city_id: "2" },
			"city_id",
		);
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "9"));
		expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe("2");
	});

	test("multi-level chain: a grandparent change cascades through the middle field", () => {
		const cap = mountHook(
			{ dependsOn: ["country_id"] },
			{ country_id: "5", city_id: "2" },
			"city_id",
		);
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", null));
		const s = cap.states.at(-1) as DependencyState;
		expect(s.ready).toBe(false);
		expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe(null);
	});
});

// ── Integration with RelationForm ──────────────────────────────────────────────

interface RelCapture {
	ctrls: FormController[];
	deps?: Record<string, string>;
}

function renderRelation(opts: RelationOptionsBag, initial: Record<string, unknown>) {
	const cap: RelCapture = { ctrls: [] };
	function Harness() {
		const ctrl = useFormController({ initial });
		cap.ctrls.push(ctrl);
		const raw = ctrl.data.city_id;
		return (
			<FormControllerProvider value={ctrl}>
				<RelationForm
					name="city_id"
					value={typeof raw === "string" ? raw : null}
					onChange={(v) => ctrl.set("city_id", v)}
					options={opts}
				/>
			</FormControllerProvider>
		);
	}
	const result = render(
		<Wrap>
			<Harness />
		</Wrap>,
	);
	return { cap, container: result.container };
}

describe("RelationForm dependencies", () => {
	test("disabled and never queries while the parent is empty", async () => {
		const query = mock(async () => ROWS);
		const opts: RelationOptionsBag = {
			query,
			onLoad,
			optionLabel,
			optionValue,
			dependsOn: ["country_id"],
		};
		const { container } = renderRelation(opts, { country_id: null, city_id: null });

		await waitFor(() =>
			expect(container.querySelector('[data-testid="relation-city_id"]')).not.toBeNull(),
		);
		const button = container.querySelector(
			'[data-testid="relation-city_id"]',
		) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		expect(query).not.toHaveBeenCalled();
	});

	test("queries with the parent value once the parent is set", async () => {
		let capturedDeps: Record<string, string> | undefined;
		const query = mock(
			async (_ctx: unknown, _search: string, deps?: Record<string, string>) => {
				capturedDeps = deps;
				return ROWS;
			},
		);
		const opts: RelationOptionsBag = {
			query,
			onLoad,
			optionLabel,
			optionValue,
			dependsOn: ["country_id"],
			whenParentEmpty: "empty",
		};
		const { cap } = renderRelation(opts, { country_id: null, city_id: null });

		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "5"));
		await waitFor(() => expect(query).toHaveBeenCalled());
		expect(capturedDeps).toEqual({ country_id: "5" });
	});

	test("changing the parent clears the previously selected child value", async () => {
		const query = mock(async () => ROWS);
		const opts: RelationOptionsBag = {
			query,
			onLoad,
			optionLabel,
			optionValue,
			dependsOn: ["country_id"],
		};
		const { cap } = renderRelation(opts, { country_id: "5", city_id: "2" });

		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "9"));
		await waitFor(() => expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe(null));
	});

	test("clearing the parent leaves the field disabled instead of stuck loading", async () => {
		let resolveRows = (_rows: Row[]): void => {};
		const query = mock(
			() =>
				new Promise<Row[]>((resolve) => {
					resolveRows = resolve;
				}),
		);
		const opts: RelationOptionsBag = {
			query,
			onLoad,
			optionLabel,
			optionValue,
			dependsOn: ["country_id"],
		};
		const { cap, container } = renderRelation(opts, { country_id: "5", city_id: null });

		await waitFor(() => expect(query).toHaveBeenCalled());
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", null));
		await waitFor(() =>
			expect(container.querySelector('[data-testid="relation-city_id"]')).not.toBeNull(),
		);
		const button = container.querySelector(
			'[data-testid="relation-city_id"]',
		) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		act(() => resolveRows(ROWS));
	});

	test("keepValue refetches the selected label when deps change", async () => {
		const loadedDeps: Array<Record<string, string> | undefined> = [];
		const load = mock(
			async (_ctx: unknown, value: string, deps?: Record<string, string>): Promise<Row> => {
				loadedDeps.push(deps);
				return onLoad(_ctx, value);
			},
		);
		const opts: RelationOptionsBag = {
			query: mock(async () => ROWS),
			onLoad: load,
			optionLabel,
			optionValue,
			dependsOn: ["country_id"],
			keepValue: true,
		};
		const { cap } = renderRelation(opts, { country_id: "5", city_id: "2" });

		await waitFor(() => expect(loadedDeps.at(-1)).toEqual({ country_id: "5" }));
		act(() => (cap.ctrls.at(-1) as FormController).set("country_id", "9"));
		await waitFor(() => expect(loadedDeps.at(-1)).toEqual({ country_id: "9" }));
		expect((cap.ctrls.at(-1) as FormController).data.city_id).toBe("2");
	});
});
