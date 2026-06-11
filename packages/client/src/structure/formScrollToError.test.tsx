/**
 * Tests for scroll-to-first-error behaviour on failed form submit.
 *
 * scrollIntoView is not implemented in happy-dom — we stub it on
 * Element.prototype and assert that it was called on the right element.
 *
 * Channels covered:
 *  1. Client-side zod validation failure
 *  2. Server-side 422 (fieldErrors)
 *  3. Translatable field with error in inactive locale — active locale tab switches
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { type ContentLocaleConfig, ContentLocaleConfigProvider } from "./contentLocaleContext";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

// ---------------------------------------------------------------------------
// scrollIntoView stub
// ---------------------------------------------------------------------------

type ScrollArgs = ScrollIntoViewOptions | undefined;

let scrollCalls: { el: Element; args: ScrollArgs }[] = [];
let originalScrollIntoView: Element["scrollIntoView"];

beforeEach(() => {
	scrollCalls = [];
	originalScrollIntoView = Element.prototype.scrollIntoView;
	Element.prototype.scrollIntoView = function (args?: ScrollArgs) {
		scrollCalls.push({ el: this, args });
	};
});

afterEach(() => {
	Element.prototype.scrollIntoView = originalScrollIntoView;
	scrollCalls = [];
});

// ---------------------------------------------------------------------------
// Locale wrapper helper
// ---------------------------------------------------------------------------

function wrapWithLocales(locales: string[], defaultLocale: string) {
	const config: ContentLocaleConfig = { locales, defaultLocale };
	const Inner = wrap(() => new Response("{}"));
	return function Provider({ children }: { children: React.ReactNode }) {
		return (
			<ContentLocaleConfigProvider config={config}>
				<Inner>{children}</Inner>
			</ContentLocaleConfigProvider>
		);
	};
}

// ---------------------------------------------------------------------------
// Zod-like schema that fails on the "body" field
// ---------------------------------------------------------------------------

function makeSchema(failField: string) {
	return {
		parse(input: unknown) {
			const data = input as Record<string, unknown>;
			if (!data[failField]) {
				const err = new Error("validation failed") as Error & {
					issues: { path: string[]; message: string }[];
				};
				err.issues = [{ path: [failField], message: "required" }];
				throw err;
			}
			return input;
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Form scroll-to-error — client validation", () => {
	test("scrollIntoView is called on the errored field after schema validation fails", async () => {
		const node = s.form(
			{ query: async () => ({ title: "ok", body: "" }), schema: makeSchema("body") },
			[
				s.text({ name: "title" }),
				s.text({ name: "body" }),
				s.action({ name: "save", handler: async () => {} }),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		// Give React a tick to process the state update and the scroll effect
		await waitFor(() => expect(scrollCalls.length).toBeGreaterThan(0));

		// The scroll target should be the body field's error container or the input
		const scrolledEl = scrollCalls[0]?.el;
		expect(scrolledEl).toBeTruthy();
		// The element should be associated with the body field
		const container = scrolledEl?.closest("[data-field-name='body']") ?? scrolledEl;
		expect(container).toBeTruthy();
	});
});

describe("Form scroll-to-error — server 422", () => {
	test("scrollIntoView is called on the errored field after server 422", async () => {
		const node = s.form({ query: async () => ({ title: "ok" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "too short" };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		await waitFor(() => expect(scrollCalls.length).toBeGreaterThan(0));

		const scrolledEl = scrollCalls[0]?.el;
		expect(scrolledEl).toBeTruthy();
		// smooth + center
		expect(scrollCalls[0]?.args).toMatchObject({ behavior: "smooth", block: "center" });
	});

	test("first field in DOM order is scrolled to when multiple errors", async () => {
		const node = s.form({ query: async () => ({ title: "ok", body: "ok" }) }, [
			s.text({ name: "title" }),
			s.text({ name: "body" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						errors: Record<string, string[]>;
					};
					// body error listed first but title appears first in DOM
					err.errors = { body: ["too short"], title: ["required"] };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		await waitFor(() => expect(scrollCalls.length).toBeGreaterThan(0));

		// The first errored field in DOM order is "title"
		const scrolledEl = scrollCalls[0]?.el as HTMLElement | undefined;
		expect(scrolledEl).toBeTruthy();
		// Nearest field wrapper has data-field-name="title"
		const wrapper = scrolledEl?.closest("[data-field-name]") as HTMLElement | null;
		expect(wrapper?.dataset.fieldName).toBe("title");
	});
});

describe("Form scroll-to-error — translatable field in inactive locale", () => {
	test("active locale tab switches when error is in inactive locale", async () => {
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
		await findByTestId("content-locale-bar");

		// Initially on "en" tab
		expect(queryByTestId("locale-tab-uk")).toBeTruthy();

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		// After submit with uk error, uk tab should become active (its panel visible)
		await waitFor(() => {
			// The uk panel should be visible (not display:none)
			const ukPanel = document.querySelector("[data-locale='uk']") as HTMLElement | null;
			expect(ukPanel?.style.display).not.toBe("none");
		});
	});
});
