/**
 * Regression tests for the apiBase wiring (media 404 fix, second iteration).
 *
 * Bug history:
 * 1. ClientProvider had no base — media requests went to /media/* (root) → 404.
 * 2. First fix set ClientProvider baseUrl="/admin/api" globally — that
 *    double-prefixed table/chart queries which pass already-absolute paths
 *    (`/admin/<page>/tables/x` became `/admin/api/admin/<page>/tables/x`) → 404.
 *
 * Contract: the base client is prefix-free; only media paths get apiBase,
 * via useMediaClient().
 *
 * NOTE: no mock.module("@inertiajs/react") here — bun module mocks are global
 * for the whole run and leak into later test files.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { ClientProvider, useClient } from "../data/client";
import { useMediaClient } from "../media/useMediaApi";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";

/** Captures fetch requests and returns an empty JSON response. */
function makeCapturingFetch() {
	const captured: string[] = [];
	const impl = (input: RequestInfo | URL): Promise<Response> => {
		const url =
			typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		captured.push(url);
		return Promise.resolve(
			new Response(JSON.stringify({ data: [], total: 0, page: 1, perPage: 24 }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	};
	return { captured, impl: impl as unknown as typeof fetch };
}

function TableProbe() {
	const client = useClient();
	return (
		<button
			data-testid="table-probe"
			type="button"
			onClick={() => {
				void client.get("/admin/posts/tables/posts");
			}}
		>
			fetch
		</button>
	);
}

function MediaProbe() {
	const client = useMediaClient();
	return (
		<button
			data-testid="media-probe"
			type="button"
			onClick={() => {
				void client.get("/media");
			}}
		>
			fetch
		</button>
	);
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("apiBase wiring (AdminPage ClientProvider contract)", () => {
	test("absolute table-style paths are NOT prefixed by apiBase", async () => {
		const { captured, impl } = makeCapturingFetch();
		const { getByTestId } = render(
			<ClientProvider apiBase="/admin/api" fetch={impl}>
				<TableProbe />
			</ClientProvider>,
		);

		await act(async () => {
			getByTestId("table-probe").click();
		});

		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(captured[0]).toBe("/admin/posts/tables/posts");
	});

	test("media paths get the apiBase prefix via useMediaClient", async () => {
		const { captured, impl } = makeCapturingFetch();
		const { getByTestId } = render(
			<ClientProvider apiBase="/admin/api" fetch={impl}>
				<MediaProbe />
			</ClientProvider>,
		);

		await act(async () => {
			getByTestId("media-probe").click();
		});

		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(captured[0]).toBe("/admin/api/media");
	});

	test("media paths stay relative without apiBase (defaults to empty)", async () => {
		const { captured, impl } = makeCapturingFetch();
		const { getByTestId } = render(
			<ClientProvider fetch={impl}>
				<MediaProbe />
			</ClientProvider>,
		);

		await act(async () => {
			getByTestId("media-probe").click();
		});

		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(captured[0]).toBe("/media");
	});
});
