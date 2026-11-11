import { describe, expect, it } from "bun:test";
import type { ClientActionContext } from "../types";
import { exportQuery } from "./exportRequest";

function ctx(queryParams: Record<string, unknown>): ClientActionContext {
	return { table: { queryParams } } as unknown as ClientActionContext;
}

describe("exportQuery", () => {
	it("sends the table's filters as flat keys, without pagination", () => {
		const url = exportQuery(
			ctx({
				page: 3,
				perPage: 25,
				sort: "title:desc",
				filters: { status: "draft", tags: ["a", "b"], created: { from: "2026-01-01" } },
				colSearch: { slug: "hello" },
			}),
			{
				url: "/admin/posts/tables/posts/export/export",
				format: "csv",
				columns: ["id"],
				fallbackName: "x",
			},
		);
		const query = new URL(url, "http://x").searchParams;
		expect(query.get("page")).toBeNull();
		expect(query.get("perPage")).toBeNull();
		expect(query.get("sort")).toBe("title");
		expect(query.get("dir")).toBe("desc");
		expect(query.get("filters[status]")).toBe("draft");
		expect(query.get("filters[tags][1]")).toBe("b");
		expect(query.get("filters[created][from]")).toBe("2026-01-01");
		expect(query.get("colSearch[slug]")).toBe("hello");
		expect(query.getAll("columns[]")).toEqual(["id"]);
	});
});
