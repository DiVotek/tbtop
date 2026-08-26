import { describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { FormController } from "../structure/types";
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

// Dependent-reset-during-hydration coverage (a saved child value must survive
// its parent landing after mount, whether or not the field is hidden) now
// lives at the form level — see structure/dependentResets.test.tsx.

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
