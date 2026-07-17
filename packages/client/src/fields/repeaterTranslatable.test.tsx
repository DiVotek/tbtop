/**
 * Translatable subfields inside repeaters (audit 5.26): sub-fields with
 * ->translatable() must render through TranslatableWrapper the same way a
 * top-level field does — per-locale inputs, ContentLocaleBar detection, and
 * a locale-aware collapsed-row summary. Covers nesting to depth 2 (the
 * cms-menu case: items.*.children.*.label).
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import {
	type ContentLocaleConfig,
	ContentLocaleConfigProvider,
} from "../structure/contentLocaleContext";
import { s } from "../structure/structure";
import { wrapForStructure } from "../structure/testFixtures";

ensureBuiltinsRegistered();

function wrapWithLocales(locales: string[], defaultLocale: string) {
	const config: ContentLocaleConfig = { locales, defaultLocale };
	const Inner = wrapForStructure(() => new Response("{}"));
	return function Provider({ children }: { children: React.ReactNode }) {
		return (
			<ContentLocaleConfigProvider config={config}>
				<Inner>{children}</Inner>
			</ContentLocaleConfigProvider>
		);
	};
}

function translatableText(name: string) {
	return (sb: Parameters<Parameters<typeof s.repeater>[0]["fields"]>[0]) =>
		(sb as typeof s).text({ name, translatable: true } as Parameters<typeof s.text>[0]);
}

describe("translatable subfield inside a repeater", () => {
	test("renders a per-locale TranslatableWrapper input, not a single flat control", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ items: [{ label: { en: "Home", uk: "Головна" } }] }) },
			[
				s.repeater({
					name: "items",
					fields: (sb) => [translatableText("label")(sb)],
				}),
			],
		);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		const enInput = container.querySelector<HTMLInputElement>('input[name="label.en"]');
		const ukInput = container.querySelector<HTMLInputElement>('input[name="label.uk"]');
		expect(enInput?.value).toBe("Home");
		expect(ukInput?.value).toBe("Головна");
	});

	test("ContentLocaleBar appears when the only translatable field lives inside a repeater", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ items: [{ label: "Home" }] }) }, [
			s.repeater({
				name: "items",
				fields: (sb) => [translatableText("label")(sb)],
			}),
		]);
		const { queryByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("form-block");
		expect(queryByTestId("content-locale-bar")).not.toBeNull();
	});

	test("no ContentLocaleBar when no field (top-level or in a repeater) is translatable", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ items: [{ label: "Home" }] }) }, [
			s.repeater({
				name: "items",
				fields: (sb) => [sb.text({ name: "label" })],
			}),
		]);
		const { queryByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("form-block");
		expect(queryByTestId("content-locale-bar")).toBeNull();
	});

	test("editing the active-locale panel updates only that locale in the item's value", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ items: [{ label: { en: "Home", uk: "" } }] }) },
			[
				s.repeater({
					name: "items",
					fields: (sb) => [translatableText("label")(sb)],
				}),
			],
		);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		const enInput = container.querySelector<HTMLInputElement>('input[name="label.en"]');
		expect(enInput).not.toBeNull();
		await act(async () => {
			fireEvent.change(enInput as HTMLInputElement, { target: { value: "Homepage" } });
		});
		await waitFor(() =>
			expect(container.querySelector<HTMLInputElement>('input[name="label.en"]')?.value).toBe(
				"Homepage",
			),
		);
		// uk panel (mounted, hidden) is untouched.
		const ukInput = container.querySelector<HTMLInputElement>('input[name="label.uk"]');
		expect(ukInput?.value).toBe("");
	});

	test("nested repeater (depth 2): translatable subfield works at both levels", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{
				query: async () => ({
					items: [
						{
							label: { en: "Parent", uk: "Батько" },
							children: [{ label: { en: "Child", uk: "Дитина" } }],
						},
					],
				}),
			},
			[
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
			],
		);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		// Parent-level translatable subfield.
		const parentEn = container.querySelector<HTMLInputElement>('input[name="label.en"]');
		expect(parentEn?.value).toBe("Parent");

		// Both label.en inputs exist (parent + nested child).
		const allEnInputs = container.querySelectorAll<HTMLInputElement>('input[name="label.en"]');
		expect(allEnInputs.length).toBe(2);
		const values = Array.from(allEnInputs).map((el) => el.value);
		expect(values).toContain("Parent");
		expect(values).toContain("Child");

		const allUkInputs = container.querySelectorAll<HTMLInputElement>('input[name="label.uk"]');
		const ukValues = Array.from(allUkInputs).map((el) => el.value);
		expect(ukValues).toContain("Батько");
		expect(ukValues).toContain("Дитина");
	});
});

describe("collapsible repeater summary with a translatable summary field", () => {
	test("shows the active locale's value, not [object Object] or blank", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ items: [{ label: { en: "Home", uk: "Головна" } }] }) },
			[
				s.repeater({
					name: "items",
					collapsible: true,
					summary: "label",
					fields: (sb) => [translatableText("label")(sb)],
				} as Parameters<typeof s.repeater>[0]),
			],
		);
		const { getByText, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");
		expect(getByText("Home")).toBeTruthy();
	});

	test("falls back to the default locale when the active locale's translation is empty", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ items: [{ label: { en: "Home", uk: "" } }] }) },
			[
				s.repeater({
					name: "items",
					collapsible: true,
					summary: "label",
					fields: (sb) => [translatableText("label")(sb)],
				} as Parameters<typeof s.repeater>[0]),
			],
		);
		const { getByText, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		// Switch active locale to uk, whose translation is empty — summary
		// must fall back to the default locale ("en" -> "Home"), not blank.
		const ukTab = await findByTestId("locale-tab-uk");
		await act(async () => {
			fireEvent.click(ukTab);
		});
		expect(getByText("Home")).toBeTruthy();
	});

	test("falls back to the first non-empty locale when the default locale is also empty", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ items: [{ label: { en: "", uk: "Головна" } }] }) },
			[
				s.repeater({
					name: "items",
					collapsible: true,
					summary: "label",
					fields: (sb) => [translatableText("label")(sb)],
				} as Parameters<typeof s.repeater>[0]),
			],
		);
		const { getByText, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");
		expect(getByText("Головна")).toBeTruthy();
	});

	test("shows 'Untitled' when every locale is empty", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ items: [{ label: { en: "", uk: "" } }] }) }, [
			s.repeater({
				name: "items",
				collapsible: true,
				summary: "label",
				fields: (sb) => [translatableText("label")(sb)],
			} as Parameters<typeof s.repeater>[0]),
		]);
		const { getByText, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");
		expect(getByText("Untitled")).toBeTruthy();
	});
});
