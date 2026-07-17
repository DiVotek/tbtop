import { describe, expect, test } from "bun:test";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { s } from "../structure/structure";
import { serializeFormData } from "./serializeFormData";

ensureBuiltinsRegistered();

function translatableText(name: string) {
	return (sb: typeof s) => sb.text({ name, translatable: true } as Parameters<typeof s.text>[0]);
}

describe("serializeFormData: translatable fields inside repeaters", () => {
	test("passes a translatable repeater subfield locale map through unchanged", () => {
		const formNode = s.form({}, [
			s.repeater({
				name: "items",
				fields: (sb) => [translatableText("label")(sb)],
			}),
		]);
		const data = {
			items: [
				{ label: { en: "Home", uk: "Головна" } },
				{ label: { en: "About", uk: "Про нас" } },
			],
		};

		const out = serializeFormData(data, formNode);

		expect(out.items).toEqual([
			{ label: { en: "Home", uk: "Головна" } },
			{ label: { en: "About", uk: "Про нас" } },
		]);
	});

	test("round-trips a translatable subfield inside a nested (depth-2) repeater", () => {
		const formNode = s.form({}, [
			s.repeater({
				name: "items",
				fields: (sb) => [
					translatableText("label")(sb),
					sb.repeater({
						name: "children",
						fields: (sb2) => [translatableText("label")(sb2)],
					}),
				],
			}),
		]);
		const data = {
			items: [
				{
					label: { en: "Parent", uk: "Батько" },
					children: [{ label: { en: "Child", uk: "Дитина" } }],
				},
			],
		};

		const out = serializeFormData(data, formNode);

		expect(out.items).toEqual([
			{
				label: { en: "Parent", uk: "Батько" },
				children: [{ label: { en: "Child", uk: "Дитина" } }],
			},
		]);
	});

	test("leaves a non-translatable repeater subfield value as a plain string", () => {
		const formNode = s.form({}, [
			s.repeater({
				name: "items",
				fields: (sb) => [sb.text({ name: "label" })],
			}),
		]);
		const data = { items: [{ label: "Plain" }] };

		const out = serializeFormData(data, formNode);

		expect(out.items).toEqual([{ label: "Plain" }]);
	});
});
