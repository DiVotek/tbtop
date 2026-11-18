import { describe, expect, test } from "bun:test";
import { Radio } from "../src";
import { memoryDriver, memoryQuery } from "../src/adapters/memory";
import { applyFilters } from "../src/server/tableFilters";

const options = (field: Radio) =>
	(field.toJSON() as { options: { options?: unknown } }).options.options;

describe("Radio.ternary (Radio::ternary)", () => {
	test("sets Any/Yes/No options with an empty Any value", () => {
		expect(options(new Radio("active").ternary())).toEqual([
			{ value: "", label: "Any" },
			{ value: "1", label: "Yes" },
			{ value: "0", label: "No" },
		]);
	});

	test("takes custom labels", () => {
		const labels = (
			options(new Radio("active").ternary("Усі", "Так", "Ні")) as { label: string }[]
		).map((o) => o.label);
		expect(labels).toEqual(["Усі", "Так", "Ні"]);
	});

	test("does not override options already set", () => {
		const field = new Radio("active").options([{ value: "yes", label: "Yep" }]).ternary();
		expect(options(field)).toEqual([{ value: "yes", label: "Yep" }]);
	});

	const rows = [
		{ id: 1, title: "Alpha", featured: 1 },
		{ id: 2, title: "Beta", featured: 0 },
		{ id: 3, title: "Gamma", featured: 0 },
	];
	test.each([
		["", ["Alpha", "Beta", "Gamma"]],
		["1", ["Alpha"]],
		["0", ["Beta", "Gamma"]],
	])("filters %p as any/yes/no", async (value, titles) => {
		const driver = memoryDriver();
		const query = applyFilters(
			[new Radio("featured").ternary()],
			{ featured: value },
			{
				driver,
				query: memoryQuery(() => rows),
			},
		);
		const found = await driver.rows(query, { page: 1, perPage: 10 });
		expect(found.map((r) => r.title)).toEqual(titles);
	});
});
