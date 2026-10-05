import { expect, test } from "bun:test";
import { chartQueryFor } from "./chartQueryCache";

test("chart query cache keeps stable references and evicts the least recently used endpoint", () => {
	const queryFor = (key: string) => chartQueryFor(`/chart-query-cache-test/${key}`, "series");
	const hot = queryFor("hot");
	const cold = queryFor("cold");

	expect(queryFor("hot")).toBe(hot);

	for (let index = 0; index < 126; index++) {
		queryFor(`filler-${index}`);
	}
	expect(queryFor("hot")).toBe(hot);
	queryFor("overflow");

	expect(queryFor("cold")).not.toBe(cold);
	expect(queryFor("hot")).toBe(hot);
});
