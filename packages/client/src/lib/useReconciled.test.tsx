import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { isEqual } from "../structure/formController";
import { type ReconcileOptions, useReconciled } from "./useReconciled";

interface Observed {
	changed: boolean;
	keyChanged: boolean;
}

interface Harness<T> {
	renders: Observed[];
	push: (incoming: T, options?: ReconcileOptions<T>) => void;
}

/** Accepts on every change, mirroring how the migrated call sites use it. */
function mountAccepting<T>(initial: T, options?: ReconcileOptions<T>): Harness<T> {
	const renders: Observed[] = [];
	function Probe(props: { incoming: T; options?: ReconcileOptions<T> }) {
		const state = useReconciled(props.incoming, props.options);
		renders.push({ changed: state.changed, keyChanged: state.keyChanged });
		if (state.changed) {
			state.accept();
		}
		return null;
	}
	const view = render(<Probe incoming={initial} options={options} />);
	return {
		renders,
		push: (incoming, next) => view.rerender(<Probe incoming={incoming} options={next} />),
	};
}

describe("useReconciled", () => {
	it("reports no change on the first render", () => {
		const probe = mountAccepting("a");

		expect(probe.renders).toEqual([{ changed: false, keyChanged: false }]);
	});

	it("reports a change when the value differs", () => {
		const probe = mountAccepting("a");
		probe.push("b");

		expect(probe.renders[1]).toEqual({ changed: true, keyChanged: false });
	});

	it("stays unchanged once the incoming value has been accepted", () => {
		const probe = mountAccepting("a");
		probe.push("b");
		probe.push("b");

		expect(probe.renders[2]).toEqual({ changed: false, keyChanged: false });
	});

	it("treats a fresh but deep-equal object as unchanged under a value comparison", () => {
		const options: ReconcileOptions<Record<string, unknown>> = { isEqual };
		const probe = mountAccepting<Record<string, unknown>>({ title: "x" }, options);

		probe.push({ title: "x" }, options);

		expect(probe.renders[1]).toEqual({ changed: false, keyChanged: false });
	});

	it("treats a fresh equal object as changed under the default identity comparison", () => {
		const probe = mountAccepting<Record<string, unknown>>({ title: "x" });

		probe.push({ title: "x" });

		expect(probe.renders[1]).toEqual({ changed: true, keyChanged: false });
	});

	it("flags a key change even when the value compares equal", () => {
		const probe = mountAccepting("same", { key: "row-1" });

		probe.push("same", { key: "row-2" });

		expect(probe.renders[1]).toEqual({ changed: true, keyChanged: true });
	});
});
