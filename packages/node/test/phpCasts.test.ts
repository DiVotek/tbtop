import { describe, expect, test } from "bun:test";
import { collectAttributes, runWithContext, S } from "../src";

describe("PHP parity of small casts", () => {
	test("boolean option values cast as PHP does: true is 1, false is empty", () => {
		const s = new S();
		const select = s.select("on").options([
			{ value: true, label: "Yes" },
			{ value: false, label: "No" },
		]);
		const wire = JSON.parse(JSON.stringify(select));
		expect(wire.options.options.map((o: { value: string }) => o.value)).toEqual(["1", ""]);
	});

	test("attributes key translatable fields per locale, multiple values and rows under .*", () => {
		const s = new S();
		const attributes = runWithContext({ contentLocales: ["en", "uk"] }, () =>
			collectAttributes([
				s.text("title").label("Title").translatable(),
				s.select("tags").label("Tags").multiple().options([]),
				s
					.repeater("rows")
					.label("Rows")
					.fields([s.text("name").label("Name")]),
			]),
		);
		expect(attributes).toEqual({
			"title.en": "Title (en)",
			"title.uk": "Title (uk)",
			tags: "Tags",
			"tags.*": "Tags",
			rows: "Rows",
			"rows.*.name": "Name",
		});
	});
});
