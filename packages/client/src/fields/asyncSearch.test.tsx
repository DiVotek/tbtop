import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import type { ClientActionContext } from "../structure/types";
import { useAsyncSearch } from "./asyncSearch";

const CTX = {} as ClientActionContext;

function Probe({
	query,
	search,
}: {
	query: (c: ClientActionContext, s: string) => Promise<unknown[]>;
	search: string;
}) {
	const state = useAsyncSearch({ ctx: CTX, query, search });
	return <span data-testid="state">{state.kind}</span>;
}

describe("useAsyncSearch — debounce", () => {
	test("a burst of keystrokes collapses into one request for the final text", async () => {
		// Rule: only the settled search string reaches the endpoint. Without the
		// delay every keystroke is its own round trip.
		const query = mock(async (_c: ClientActionContext, _s: string): Promise<unknown[]> => []);
		const { rerender } = render(<Probe query={query} search="" />);
		await waitFor(() => expect(query).toHaveBeenCalledTimes(1));

		for (const s of ["B", "Bo", "Bob"]) {
			rerender(<Probe query={query} search={s} />);
		}

		await waitFor(() => {
			expect(query.mock.calls.some((c) => c[1] === "Bob")).toBe(true);
		});
		// The mount call plus one settled call — the intermediate text never flies.
		expect(query).toHaveBeenCalledTimes(2);
		expect(query.mock.calls.map((c) => c[1])).toEqual(["", "Bob"]);
	});

	test("the first search runs without waiting out the debounce", async () => {
		// Rule: mount must not park the control in a skeleton for the delay.
		const query = mock(async (_c: ClientActionContext, _s: string): Promise<unknown[]> => []);
		render(<Probe query={query} search="" />);

		await waitFor(() => expect(query).toHaveBeenCalledTimes(1), { timeout: 100 });
	});
});
