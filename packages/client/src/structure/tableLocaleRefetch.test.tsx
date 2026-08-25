import { afterEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { TableBlock } from "./tableBlock";
import type { TableBlockOptions } from "./tableBlock.types";
import { wrapForStructure } from "./testFixtures";
import type { ClientActionContext, ListQueryParams } from "./types";

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
};

const originalUrl = window.location.href;

afterEach(() => {
	window.history.replaceState(null, "", originalUrl);
});

describe("Table locale refetch", () => {
	test("a rematerialized query ignores a late old-locale response and preserves params", async () => {
		const search = new URLSearchParams();
		search.set("t[localeRows][sort]", "views:desc");
		search.set("t[localeRows][page]", "2");
		search.set("t[localeRows][perPage]", "10");
		search.set("t[localeRows][published]", "1");
		window.history.replaceState(null, "", `/?${search.toString()}`);

		const oldResponse = deferred<unknown>();
		const newResponse = deferred<unknown>();
		const oldParams: ListQueryParams[] = [];
		const newParams: ListQueryParams[] = [];
		const oldQuery = queryWithParams(oldResponse, oldParams);
		const newQuery = queryWithParams(newResponse, newParams);
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { findByText, queryByText, rerender } = render(
			<Wrap>
				<TableBlock options={tableOptions("Active", oldQuery)} />
			</Wrap>,
		);

		await waitFor(() => expect(oldParams).toHaveLength(1));

		rerender(
			<Wrap>
				<TableBlock options={tableOptions("Активні", newQuery)} />
			</Wrap>,
		);

		await waitFor(() => expect(newParams).toHaveLength(1));
		await act(async () => {
			newResponse.resolve({ data: [{ id: "new", status: "Активні" }], total: 22 });
		});

		const badge = await findByText("Активні");
		expect(badge.className).toContain("bg-success");

		await act(async () => {
			oldResponse.resolve({ data: [{ id: "old", status: "Active" }], total: 22 });
		});

		expect(queryByText("Active")).toBeNull();
		expect((await findByText("Активні")).className).toContain("bg-success");
		expect(oldParams).toEqual([expectedParams()]);
		expect(newParams).toEqual([expectedParams()]);
	});
});

function tableOptions(
	status: string,
	query: (ctx: ClientActionContext) => Promise<unknown>,
): TableBlockOptions {
	return {
		name: "localeRows",
		query,
		columns: [
			{
				name: "status",
				kind: "badge",
				badge: { colors: { [status]: "success" } },
			},
		],
	};
}

function queryWithParams(
	response: Deferred<unknown>,
	captured: ListQueryParams[],
): (ctx: ClientActionContext) => Promise<unknown> {
	return (ctx) => {
		captured.push(ctx.table?.queryParams ?? {});
		return response.promise;
	};
}

function expectedParams(): ListQueryParams {
	return {
		sort: "views:desc",
		page: 2,
		perPage: 10,
		filters: { published: "1" },
	};
}

function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
