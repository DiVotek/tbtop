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
});
