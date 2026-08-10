import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import type { ClientActionContext } from "../structure/types";
import { type AsyncMultiOptionsBag, useMultiResolvedLabels } from "./asyncOptions";

const CTX = {} as ClientActionContext;

interface Row {
	id: string;
	name: string;
}

function Probe({ value, opts }: { value: string[]; opts: AsyncMultiOptionsBag }) {
	const state = useMultiResolvedLabels({ ctx: CTX, fieldName: "tags", value, opts });
	return <span data-testid="state">{state.kind}</span>;
}

function delay(ms: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
}

describe("useMultiResolvedLabels — id transport", () => {
	test("multi-character ids reach onLoad unmodified", async () => {
		// Mutation caught: restoring join("")/split("") shreds each id into
		// single characters before onLoad ever sees them.
		const onLoad = mock(
			async (_c: ClientActionContext, ids: string[]): Promise<Row[]> =>
				ids.map((id) => ({ id, name: id })),
		);
		const opts: AsyncMultiOptionsBag = {
			onLoad,
			optionValue: (r) => (r as Row).id,
			optionLabel: (r) => (r as Row).name,
		};
		render(<Probe value={["uuid-12", "uuid-34"]} opts={opts} />);

		await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
		expect(onLoad.mock.calls[0]?.[1]).toEqual(["uuid-12", "uuid-34"]);
	});

	test("a content-identical new array does not re-trigger the load", async () => {
		// Mutation caught: using `value` directly as the effect dependency —
		// a fresh array identity on every render would re-run the load forever.
		const onLoad = mock(
			async (_c: ClientActionContext, ids: string[]): Promise<Row[]> =>
				ids.map((id) => ({ id, name: id })),
		);
		const opts: AsyncMultiOptionsBag = {
			onLoad,
			optionValue: (r) => (r as Row).id,
			optionLabel: (r) => (r as Row).name,
		};
		const { rerender } = render(<Probe value={["uuid-12", "uuid-34"]} opts={opts} />);
		await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));

		// Fresh array, same contents and order.
		rerender(<Probe value={["uuid-12", "uuid-34"]} opts={opts} />);

		await delay(50);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});
});
