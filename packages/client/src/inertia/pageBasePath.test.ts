import { describe, expect, test } from "bun:test";
import { pageBasePath } from "./pageBasePath";

describe("pageBasePath", () => {
	test("passes a plain path through", () => {
		expect(pageBasePath("/admin/pages")).toBe("/admin/pages");
	});

	test("strips the query string", () => {
		expect(pageBasePath("/admin/pages?page=2")).toBe("/admin/pages");
	});

	// Regression: /admin/pages/ built /admin/pages//tables/pages → 404.
	test("strips a trailing slash so data URLs don't double the separator", () => {
		expect(pageBasePath("/admin/pages/")).toBe("/admin/pages");
	});

	test("strips trailing slash and query together", () => {
		expect(pageBasePath("/admin/pages/?page=2")).toBe("/admin/pages");
	});

	// Regression: Inertia appends location.hash to page.url, so a deep link
	// like /admin/posts#notes built /admin/posts#notes/tables/x and the
	// fetch hit /admin/posts (fragment dropped) instead of the table route.
	test("strips a URL fragment", () => {
		expect(pageBasePath("/admin/posts#notes")).toBe("/admin/posts");
		expect(pageBasePath("/admin/posts/#notes")).toBe("/admin/posts");
	});
});
