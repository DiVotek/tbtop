import { expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { clientWrapper } from "../testFixtures";
import { useEntityRows } from "./useEntityRows";

function Probe({ entity }: { entity: string }) {
	const state = useEntityRows(entity);
	if (state.kind === "loading") {
		return <span data-testid="state">loading</span>;
	}
	if (state.kind === "error") {
		return <span data-testid="state">error</span>;
	}
	return (
		<span data-testid="state">
			{state.rows.length} rows / total {state.total}
		</span>
	);
}

test("useEntityRows returns rows from the list envelope", async () => {
	const Wrap = clientWrapper(() =>
		Response.json({
			data: [
				{ id: "a", title: "First" },
				{ id: "b", title: "Second" },
			],
			page: 1,
			perPage: 25,
			total: 2,
		}),
	);
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" />
		</Wrap>,
	);
	await waitFor(() => expect(getByTestId("state").textContent).toBe("2 rows / total 2"));
});

test("useEntityRows reports error on failure", async () => {
	const Wrap = clientWrapper(() =>
		Response.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
	);
	const { getByTestId } = render(
		<Wrap>
			<Probe entity="posts" />
		</Wrap>,
	);
	await waitFor(() => expect(getByTestId("state").textContent).toBe("error"));
});
