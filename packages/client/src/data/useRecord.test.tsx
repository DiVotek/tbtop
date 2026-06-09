import { expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { clientWrapper } from "../testFixtures";
import { useRecord } from "./useRecord";

function Probe({ entity, id }: { entity: string; id: string }) {
	const state = useRecord(entity, id);
	if (state.kind === "loading") {
		return <span data-testid="state">loading</span>;
	}
	if (state.kind === "not-found") {
		return <span data-testid="state">not-found</span>;
	}
	if (state.kind === "error") {
		return <span data-testid="state">error</span>;
	}
	return <span data-testid="state">{JSON.stringify(state.record)}</span>;
}

test("useRecord returns the record when the client succeeds", async () => {
	const Wrap = clientWrapper(() =>
		Response.json({ data: { id: "abc", title: "Hello" } }, { status: 200 }),
	);
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" id="abc" />
		</Wrap>,
	);
	await waitFor(() => expect(getByTestId("state").textContent).toContain("Hello"));
});

test("useRecord returns not-found when the client responds 404", async () => {
	const Wrap = clientWrapper(() =>
		Response.json({ error: { code: "not_found", message: "nope" } }, { status: 404 }),
	);
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" id="missing" />
		</Wrap>,
	);
	await waitFor(() => expect(getByTestId("state").textContent).toBe("not-found"));
});

test("useRecord returns error on non-404 failures", async () => {
	const Wrap = clientWrapper(() =>
		Response.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
	);
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" id="x" />
		</Wrap>,
	);
	await waitFor(() => expect(getByTestId("state").textContent).toBe("error"));
});

test("useRecord does not fetch when id is empty", async () => {
	const calls: string[] = [];
	const Wrap = clientWrapper((req) => {
		calls.push(req.url);
		return Response.json({ data: null });
	});
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" id="" />
		</Wrap>,
	);
	await new Promise((r) => setTimeout(r, 20));
	expect(getByTestId("state").textContent).toBe("loading");
	expect(calls).toEqual([]);
});
