/**
 * Audit 5.26-inline: repeaterRow rendered no FieldError / data-field-name for
 * sub-fields, so a server-side validation error at a repeater sub-field path
 * (e.g. "items.0.label") neither highlighted the field nor let
 * scrollToFirstError find it. Covers: plain sub-field, translatable
 * sub-field (locale-suffixed key), and a nested repeater's sub-field.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { ContentLocaleConfigProvider } from "../structure/contentLocaleContext";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";

ensureBuiltinsRegistered();

function throwFieldErrors(fields: Record<string, string>): () => Promise<void> {
	return async () => {
		const err = new Error("validation") as Error & { fields: Record<string, string> };
		err.fields = fields;
		throw err;
	};
}

describe("RepeaterRow inline field errors", () => {
	test("a server error at items.0.label renders FieldError with data-field-name under that sub-field", async () => {
		const node = s.form({ query: async () => ({ items: [{ label: "" }] }) }, [
			s.repeater({
				name: "items",
				fields: (sb) => [sb.text({ name: "label", label: "Label" })],
			}),
			s.action({ name: "save", handler: throwFieldErrors({ "items.0.label": "Required" }) }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		const wrapper = await waitFor(() => {
			const el = container.querySelector('[data-field-name="items.0.label"]');
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		const error = wrapper.querySelector('[data-testid="field-error-items.0.label"]');
		expect(error).not.toBeNull();
		expect(error?.textContent).toBe("Required");
	});

	test("no error renders nothing extra (no regression)", async () => {
		const node = s.form({ query: async () => ({ items: [{ label: "ok" }] }) }, [
			s.repeater({
				name: "items",
				fields: (sb) => [sb.text({ name: "label", label: "Label" })],
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);

		const wrapper = container.querySelector('[data-field-name="items.0.label"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.querySelector("[data-testid^='field-error-']")).toBeNull();
	});

	test("a translatable sub-field error (items.0.label.en) renders under the sub-field in the active locale", async () => {
		const Inner = wrap(() => new Response("{}"));
		const Wrap = ({ children }: { children: React.ReactNode }) => (
			<ContentLocaleConfigProvider config={{ locales: ["en", "uk"], defaultLocale: "en" }}>
				<Inner>{children}</Inner>
			</ContentLocaleConfigProvider>
		);
		const node = s.form({ query: async () => ({ items: [{ label: { en: "", uk: "" } }] }) }, [
			s.repeater({
				name: "items",
				fields: (sb) => [
					sb.text({
						name: "label",
						label: "Label",
						translatable: true,
					} as Parameters<typeof sb.text>[0]),
				],
			}),
			s.action({
				name: "save",
				handler: throwFieldErrors({ "items.0.label.en": "Required" }),
			}),
		]);
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		const wrapper = await waitFor(() => {
			const el = container.querySelector('[data-field-name="items.0.label"]');
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		const error = wrapper.querySelector('[data-testid="field-error-items.0.label"]');
		expect(error).not.toBeNull();
		expect(error?.textContent).toBe("Required");
	});

	test("a nested repeater's sub-field error (items.0.children.0.label) renders under the nested sub-field", async () => {
		const node = s.form(
			{
				query: async () => ({
					items: [{ children: [{ label: "" }] }],
				}),
			},
			[
				s.repeater({
					name: "items",
					fields: (sb) => [
						sb.repeater({
							name: "children",
							fields: (inner) => [
								inner.text({ name: "label", label: "Child label" }),
							],
						}),
					],
				}),
				s.action({
					name: "save",
					handler: throwFieldErrors({ "items.0.children.0.label": "Required" }),
				}),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(
				container.querySelectorAll('[data-field-name="items.0.children.0.label"]').length,
			).toBe(1),
		);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		const wrapper = await waitFor(() => {
			const el = container.querySelector('[data-field-name="items.0.children.0.label"]');
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		const error = wrapper.querySelector('[data-testid="field-error-items.0.children.0.label"]');
		expect(error).not.toBeNull();
		expect(error?.textContent).toBe("Required");
	});
});
