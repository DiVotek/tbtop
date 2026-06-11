/**
 * tableUrlState: URL serialisation/deserialisation round-trips, mount seeding,
 * replaceState persistence, and multi-table namespacing.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	persistTableParams,
	readTableParams,
	seedTableParams,
	writeTableParams,
} from "./tableUrlState";
import type { ListQueryParams } from "./types";

// ─── pure serialisation round-trips ──────────────────────────────────────────

type RoundTripCase = {
	label: string;
	params: ListQueryParams;
};

const ROUND_TRIP_CASES: RoundTripCase[] = [
	{ label: "empty params", params: {} },
	{ label: "search only", params: { search: "hello" } },
	{ label: "sort only", params: { sort: "title:desc" } },
	{ label: "page only", params: { page: 3 } },
	{ label: "perPage only", params: { perPage: 50 } },
	{
		label: "scalar filter",
		params: { filters: { status: "draft" } },
	},
	{
		label: "array filter (tags)",
		params: { filters: { tags: ["a", "b"] } },
	},
	{
		label: "object filter (daterange)",
		params: { filters: { created_at: { from: "2024-01-01", to: "2024-12-31" } } },
	},
	{
		label: "combined search + filter + page",
		params: { search: "world", page: 2, filters: { status: "published" } },
	},
];

describe("tableUrlState: serialisation round-trip", () => {
	for (const { label, params } of ROUND_TRIP_CASES) {
		test(`tableUrlState: round-trips ${label}`, () => {
			const sp = writeTableParams(new URLSearchParams(), "posts", params);
			const read = readTableParams(sp, "posts");
			expect(read).toEqual(params);
		});
	}
});

// ─── multi-table namespacing ──────────────────────────────────────────────────

describe("tableUrlState: multi-table namespacing", () => {
	test("tableUrlState: two tables write independent keys and read each other cleanly", () => {
		const sp = new URLSearchParams();
		const after1 = writeTableParams(sp, "posts", { search: "hello", page: 2 });
		const after2 = writeTableParams(after1, "authors", {
			filters: { country: "us" },
		});

		const posts = readTableParams(after2, "posts");
		const authors = readTableParams(after2, "authors");

		expect(posts).toEqual({ search: "hello", page: 2 });
		expect(authors).toEqual({ filters: { country: "us" } });
	});

	test("tableUrlState: updating one table leaves the other intact", () => {
		let sp = new URLSearchParams();
		sp = writeTableParams(sp, "posts", { search: "alpha" });
		sp = writeTableParams(sp, "authors", { search: "beta" });

		// Now update posts — authors should be unchanged
		sp = writeTableParams(sp, "posts", { search: "gamma" });

		expect(readTableParams(sp, "posts")).toEqual({ search: "gamma" });
		expect(readTableParams(sp, "authors")).toEqual({ search: "beta" });
	});
});

// ─── empty / default value pruning ───────────────────────────────────────────

describe("tableUrlState: empty value pruning", () => {
	test("tableUrlState: empty string filter is not written to URL", () => {
		const sp = writeTableParams(new URLSearchParams(), "posts", {
			filters: { status: "" },
		});
		expect(sp.toString()).toBe("");
	});

	test("tableUrlState: null filter is not written to URL", () => {
		const sp = writeTableParams(new URLSearchParams(), "posts", {
			filters: { status: null as unknown as string },
		});
		expect(sp.toString()).toBe("");
	});

	test("tableUrlState: empty array filter is not written to URL", () => {
		const sp = writeTableParams(new URLSearchParams(), "posts", {
			filters: { tags: [] },
		});
		expect(sp.toString()).toBe("");
	});
});

// ─── history.replaceState integration ────────────────────────────────────────

describe("tableUrlState: persistTableParams calls history.replaceState", () => {
	let originalReplaceState: typeof window.history.replaceState;
	const replaceStateCalls: { url: string | URL | null | undefined }[] = [];

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
		// Reset URL before installing spy so the setup call isn't counted.
		originalReplaceState(null, "", "http://localhost/");
		window.history.replaceState = (state, title, url) => {
			replaceStateCalls.push({ url });
			originalReplaceState(state, title, url);
		};
		replaceStateCalls.length = 0;
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
	});

	test("tableUrlState: persistTableParams calls replaceState with namespaced params", () => {
		persistTableParams("posts", { search: "hello", filters: { status: "draft" } });

		expect(replaceStateCalls).toHaveLength(1);
		const url = replaceStateCalls[0]?.url as string;
		expect(url).toContain("t%5Bposts%5D%5Bsearch%5D=hello");
		expect(url).toContain("t%5Bposts%5D%5Bstatus%5D=draft");
	});

	test("tableUrlState: persistTableParams with empty params removes table keys from URL", () => {
		// First set some params
		persistTableParams("posts", { search: "hello" });
		const urlBefore = replaceStateCalls[0]?.url as string;
		expect(urlBefore).toContain("posts");

		// Clear
		replaceStateCalls.length = 0;
		persistTableParams("posts", {});

		expect(replaceStateCalls).toHaveLength(1);
		const urlAfter = replaceStateCalls[0]?.url as string;
		expect(urlAfter).not.toContain("posts");
	});

	test("tableUrlState: persistTableParams does NOT change window.location.href", () => {
		persistTableParams("posts", { search: "query" });
		// replaceState may update the URL but must not trigger a full navigation.
		// Verify that pathname is preserved.
		expect(window.location.pathname).toBe("/");
	});
});

// ─── seedTableParams ─────────────────────────────────────────────────────────

describe("tableUrlState: seedTableParams reads from window.location.search", () => {
	let originalReplaceState: typeof window.history.replaceState;

	beforeEach(() => {
		originalReplaceState = window.history.replaceState.bind(window.history);
	});

	afterEach(() => {
		window.history.replaceState = originalReplaceState;
		// Restore clean URL
		originalReplaceState(null, "", "http://localhost/");
	});

	test("tableUrlState: seedTableParams returns params written to the URL", () => {
		const sp = writeTableParams(new URLSearchParams(), "posts", {
			search: "seed",
			filters: { status: "draft" },
		});
		originalReplaceState(null, "", `/?${sp.toString()}`);

		const seeded = seedTableParams("posts");
		expect(seeded).toEqual({ search: "seed", filters: { status: "draft" } });
	});

	test("tableUrlState: seedTableParams returns empty object when URL has no state for table", () => {
		originalReplaceState(null, "", "http://localhost/");
		expect(seedTableParams("posts")).toEqual({});
	});

	test("tableUrlState: seedTableParams isolates table by name (other tables ignored)", () => {
		const sp = writeTableParams(new URLSearchParams(), "authors", { search: "other" });
		originalReplaceState(null, "", `/?${sp.toString()}`);

		expect(seedTableParams("posts")).toEqual({});
		expect(seedTableParams("authors")).toEqual({ search: "other" });
	});
});
