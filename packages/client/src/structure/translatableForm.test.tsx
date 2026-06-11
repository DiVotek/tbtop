/**
 * Translatable field integration tests — covers the form-level tab bar, locale
 * isolation, error badges, and legacy value normalization.
 *
 * Uses a minimal custom "stub" field kind to avoid Lexical / lazy imports.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import type { FieldCellProps, FieldFormProps } from "../fields/fieldProps";
import { getBlockDescriptor } from "../render/blockRegistry";
import { defineFieldClient } from "../render/defineFieldClient";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { type ContentLocaleConfig, ContentLocaleConfigProvider } from "./contentLocaleContext";
import { registerStructureBuilder, s } from "./structure";
import { wrapForStructure } from "./testFixtures";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps with ContentLocaleConfigProvider + the standard action context. */
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

/** Query input by its name attribute (works for translatable sub-inputs). */
function inputByName(container: HTMLElement, name: string): HTMLInputElement {
	const el = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
	if (!el) {
		throw new Error(`No input[name="${name}"] found`);
	}
	return el;
}

// ---------------------------------------------------------------------------
// Stub field — aria-labeled by name, enabling getByLabelText in isolation tests.
// ---------------------------------------------------------------------------
function StubForm({ name, value, onChange }: FieldFormProps<unknown>): React.ReactNode {
	return (
		<input
			aria-label={name}
			data-testid={`stub-${name}`}
			value={(value as string) ?? ""}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

function StubCell(_props: FieldCellProps<unknown>): React.ReactNode {
	return null;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Translatable form integration", () => {
	beforeEach(() => {
		ensureBuiltinsRegistered();
		if (!getBlockDescriptor("stub")) {
			defineFieldClient<"stub", unknown>("stub", {
				form: StubForm as ComponentType<FieldFormProps<unknown>>,
				cell: StubCell as ComponentType<FieldCellProps<unknown>>,
			});
			registerStructureBuilder("stub", (opts: unknown) => {
				const o = opts as Record<string, unknown>;
				return { kind: "stub", name: o.name as string, options: o, meta: {} };
			});
		}
	});

	afterEach(() => {
		// nothing to clean — registry is shared across all tests
	});

	// -----------------------------------------------------------------------
	// AC-1: locale bar only when translatable field exists
	// -----------------------------------------------------------------------
	test("tab bar is absent when no field has translatable:true", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ name: "" }) }, [s.text({ name: "name" })]);
		const { queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(queryByTestId("form-block")).not.toBeNull());
		expect(queryByTestId("content-locale-bar")).toBeNull();
	});

	test("tab bar appears when at least one field has translatable:true", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ title: { en: "Hello" } }) }, [
			s.text({ name: "title", translatable: true } as Parameters<typeof s.text>[0]),
		]);
		const { queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(queryByTestId("content-locale-bar")).not.toBeNull());
	});

	// -----------------------------------------------------------------------
	// AC-2: tab switching preserves values in both locales
	// -----------------------------------------------------------------------
	test("switching locale tabs preserves values entered in both locales", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form(
			{ query: async () => ({ title: { en: "English", uk: "Ukrainian" } }) },
			[s.text({ name: "title", translatable: true } as Parameters<typeof s.text>[0])],
		);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		// Active locale "en" input has its value.
		expect(inputByName(container, "title.en").value).toBe("English");
		// Inactive "uk" input is mounted but hidden.
		expect(inputByName(container, "title.uk").value).toBe("Ukrainian");

		// Switch to "uk" — verify that panel visibility flips.
		const ukTab = await findByTestId("locale-tab-uk");
		await act(async () => {
			fireEvent.click(ukTab);
		});
		// Both inputs remain in the DOM; "uk" value is still intact.
		expect(inputByName(container, "title.uk").value).toBe("Ukrainian");

		// Switch back to "en" — value still intact.
		const enTab = await findByTestId("locale-tab-en");
		await act(async () => {
			fireEvent.click(enTab);
		});
		expect(inputByName(container, "title.en").value).toBe("English");
	});

	// -----------------------------------------------------------------------
	// Regression: typing must not remount the input (focus loss bug)
	// -----------------------------------------------------------------------
	test("typing in a translatable field keeps focus on the input", async () => {
		const user = userEvent.setup();
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ title: { en: "" } }) }, [
			s.text({ name: "title", translatable: true } as Parameters<typeof s.text>[0]),
		]);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");

		const input = inputByName(container, "title.en");
		await user.click(input);
		await user.type(input, "ab");

		// Remount detaches the node after the first keystroke,
		// losing focus and swallowing the rest of the input.
		const after = inputByName(container, "title.en");
		expect(after.value).toBe("ab");
		expect(after.isConnected).toBe(true);
		expect(input).toBe(after);
	});

	// -----------------------------------------------------------------------
	// AC-3: error badge on inactive locale tab
	// -----------------------------------------------------------------------
	test("error badge appears on the tab whose locale has a 422 error", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ title: { en: "Hi", uk: "" } }) }, [
			s.text({ name: "title", translatable: true } as Parameters<typeof s.text>[0]),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { "title.uk": "required" };
					throw err;
				},
			}),
		]);
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		await waitFor(() => expect(queryByTestId("locale-error-badge-uk")).not.toBeNull());
		expect(queryByTestId("locale-error-badge-en")).toBeNull();
	});

	// -----------------------------------------------------------------------
	// AC-4: legacy plain-string value lands in default locale
	// -----------------------------------------------------------------------
	test("legacy plain-string value is placed in the default locale, others empty", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ title: "Legacy value" }) }, [
			s.text({ name: "title", translatable: true } as Parameters<typeof s.text>[0]),
		]);
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");
		expect(inputByName(container, "title.en").value).toBe("Legacy value");
		expect(inputByName(container, "title.uk").value).toBe("");
	});

	// -----------------------------------------------------------------------
	// AC-5: per-locale value isolation with a non-text inner kind (stub)
	// -----------------------------------------------------------------------
	test("stub-kind translatable node keeps per-locale values isolated", async () => {
		const Wrap = wrapWithLocales(["en", "uk"], "en");
		const node = s.form({ query: async () => ({ note: { en: "A", uk: "Б" } }) }, [
			(s as unknown as { stub: (opts: unknown) => ReturnType<typeof s.text> }).stub({
				name: "note",
				translatable: true,
			}),
		]);
		const { findByTestId, getByLabelText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("content-locale-bar");
		// StubForm uses aria-label={name}, so name="note.en" is queryable.
		expect((getByLabelText("note.en") as HTMLInputElement).value).toBe("A");
		expect((getByLabelText("note.uk") as HTMLInputElement).value).toBe("Б");
	});
});
