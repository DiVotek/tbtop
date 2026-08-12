import { describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { FormController } from "../structure/types";
import type { DependencyConfig } from "./fieldDependencies";
import { useFieldDependencies } from "./fieldDependencies";
import { RelationForm, type RelationOptionsBag } from "./relationField";

ensureBuiltinsRegistered();

const Wrap = wrap(() => new Response("{}"));

interface Row {
	value: string;
	label: string;
}
const ROWS: Row[] = [{ value: "period-7", label: "7 days" }];

function optionLabel(row: unknown): string {
	return (row as Row).label;
}
function optionValue(row: unknown): string {
	return (row as Row).value;
}

interface Harness {
	last: () => FormController;
	set: (field: string, value: unknown) => void;
	setMounted: (next: boolean) => void;
}

/**
 * `initial` is a prop so a test can deliver the record after mount, the way
 * Inertia page props do — that late arrival is what the reset must not read as
 * a parent change.
 */
function mountChild(config: DependencyConfig, initial: Record<string, unknown>): Harness {
	const ctrls: FormController[] = [];
	let setMounted: (next: boolean) => void = () => {};
	function Outer({ record }: { record: Record<string, unknown> }) {
		const ctrl = useFormController({ initial: record });
		const [mounted, set] = useState(true);
		setMounted = (next) => act(() => set(next));
		ctrls.push(ctrl);
		return (
			<FormControllerProvider value={ctrl}>
				{mounted ? <Child ctrl={ctrl} /> : null}
			</FormControllerProvider>
		);
	}
	function Child({ ctrl }: { ctrl: FormController }) {
		useFieldDependencies({
			name: "period_id",
			config,
			value: ctrl.data.period_id,
			onChange: (v) => ctrl.set("period_id", v),
		});
		return null;
	}
	const blank: Record<string, unknown> = {};
	for (const key of Object.keys(initial)) {
		blank[key] = "";
	}
	const r = render(<Outer record={blank} />);
	const last = () => ctrls.at(-1) as FormController;
	// formBlock's useSyncInitial resets the controller when the record prop changes.
	act(() => {
		r.rerender(<Outer record={initial} />);
	});
	act(() => {
		last().reset();
	});
	return {
		last,
		set: (field, value) => act(() => last().set(field, value)),
		setMounted: (next) => setMounted(next),
	};
}

describe("dependent reset during record hydration", () => {
	test("a saved child value survives the parent arriving after mount", () => {
		const h = mountChild({ dependsOn: ["car_id"] }, { car_id: "car-1", period_id: "period-7" });

		expect(h.last().data.period_id).toBe("period-7");
	});

	test("picking the child before the parent still clears it when the parent lands", () => {
		const h = mountChild(
			{ dependsOn: ["car_id"], whenParentEmpty: "empty" },
			{ car_id: "", period_id: "" },
		);

		h.set("period_id", "period-7");
		h.set("car_id", "car-1");

		expect(h.last().data.period_id).toBe(null);
	});

	test("re-picking the record's parent under a different child clears it", () => {
		const h = mountChild(
			{ dependsOn: ["car_id"], whenParentEmpty: "empty" },
			{ car_id: "car-1", period_id: "period-7" },
		);

		h.set("car_id", "car-2");
		h.set("period_id", "period-9");
		h.set("car_id", "car-1");

		expect(h.last().data.period_id).toBe(null);
	});

	test("a user-chosen pair survives an unmount/remount (tabs, collapsibles)", () => {
		const h = mountChild({ dependsOn: ["car_id"] }, { car_id: "car-1", period_id: "period-7" });

		h.set("car_id", "car-2");
		h.set("period_id", "period-9");
		h.setMounted(false);
		h.setMounted(true);

		expect(h.last().data.period_id).toBe("period-9");
	});
});

describe("async select label during record hydration", () => {
	test("resolves the saved value's label when the parent arrives after mount", async () => {
		const onLoad = mock(async (_ctx: unknown, value: string): Promise<Row> => {
			const found = ROWS.find((r) => r.value === value);
			if (!found) {
				throw new Error("not found");
			}
			return found;
		});
		const opts: RelationOptionsBag = {
			query: mock(async () => ROWS),
			onLoad,
			optionLabel,
			optionValue,
			dependsOn: ["car_id"],
		};
		const ctrls: FormController[] = [];
		function Host({ record }: { record: Record<string, unknown> }) {
			const ctrl = useFormController({ initial: record });
			ctrls.push(ctrl);
			const raw = ctrl.data.period_id;
			return (
				<FormControllerProvider value={ctrl}>
					<RelationForm
						name="period_id"
						value={typeof raw === "string" ? raw : null}
						onChange={(v) => ctrl.set("period_id", v)}
						options={opts}
					/>
				</FormControllerProvider>
			);
		}
		const { container, rerender } = render(
			<Wrap>
				<Host record={{ car_id: "", period_id: "" }} />
			</Wrap>,
		);

		act(() => {
			rerender(
				<Wrap>
					<Host record={{ car_id: "car-1", period_id: "period-7" }} />
				</Wrap>,
			);
		});
		act(() => {
			(ctrls.at(-1) as FormController).reset();
		});

		await waitFor(() => expect(onLoad).toHaveBeenCalled());
		expect((ctrls.at(-1) as FormController).data.period_id).toBe("period-7");
		await waitFor(() => expect(container.textContent).toContain("7 days"));
	});
});
