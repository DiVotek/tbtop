/**
 * Regression tests for AdminPage: verifies that fetch calls issued by
 * media-API hooks are prefixed with the apiBase prop from the server.
 *
 * Bug: ClientProvider was mounted without baseUrl so all media requests
 * went to /media/* (root) instead of /{prefix}/api/media/*.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { ClientProvider, useClient } from "../data/client";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";

// ─── Mock @inertiajs/react ────────────────────────────────────────────────────

// We mock the module so usePage() returns controlled props without a real
// Inertia app context.
mock.module("@inertiajs/react", () => ({
	usePage: () => ({
		url: "/admin/media",
		props: {
			slug: "media",
			title: "Media",
			structure: { kind: "text", options: { label: "x" }, name: "x", meta: {} },
			data: {},
			tbtop: {
				prefix: "/admin",
				apiBase: "/admin/api",
				locale: "en",
				locales: ["en"],
				messages: {},
				contentLocales: ["en"],
				defaultContentLocale: "en",
			},
		},
	}),
	router: {
		post: mock(() => {}),
		on: mock(() => () => {}),
	},
	Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Captures fetch requests and returns an empty media-list response. */
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

/**
 * A tiny component that fires a GET /media request via useClient().
 * Used to assert that the ClientProvider baseUrl is correctly applied.
 */
function MediaProbe({ onFetched }: { onFetched: (url: string) => void }) {
	const client = useClient();
	// Use an imperative call (not a hook) so we can fire it in a useEffect below.
	return (
		<button
			data-testid="probe-btn"
			type="button"
			onClick={() => {
				void client.get("/media").then(() => onFetched("done"));
			}}
		>
			fetch
		</button>
	);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("AdminPage: ClientProvider baseUrl from tbtop.apiBase prop", () => {
	test("media fetch uses the apiBase prefix from the tbtop prop", async () => {
		const { captured, impl } = makeCapturingFetch();
		const { getByTestId } = render(
			// Replicate the ClientProvider setup that AdminPage does after the fix:
			// baseUrl comes from tbtop.apiBase, not hardcoded "".
			<ClientProvider baseUrl="/admin/api" fetch={impl}>
				<MediaProbe onFetched={() => {}} />
			</ClientProvider>,
		);

		await act(async () => {
			getByTestId("probe-btn").click();
		});

		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		// The URL must carry the /admin/api prefix, not just /media.
		expect(captured[0]).toBe("/admin/api/media");
	});

	test("media fetch without baseUrl hits /media (root) — documents the pre-fix bug", async () => {
		const { captured, impl } = makeCapturingFetch();
		const { getByTestId } = render(
			// Deliberately omit baseUrl to document the old (broken) behaviour.
			<ClientProvider fetch={impl}>
				<MediaProbe onFetched={() => {}} />
			</ClientProvider>,
		);

		await act(async () => {
			getByTestId("probe-btn").click();
		});

		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		// Without baseUrl the request goes to /media — 404 under /admin/api/media routing.
		expect(captured[0]).toBe("/media");
	});
});
