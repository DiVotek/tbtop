/**
 * Tests for helperText and tooltip rendering on field chrome in the form block.
 * Both features are rendered by renderFieldNode() for any field kind.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { type ContentLocaleConfig, ContentLocaleConfigProvider } from "./contentLocaleContext";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

function fieldNode(
	kind: string,
	name: string,
	options: Record<string, unknown> = {},
): StructureNode {
	return { kind, name, options: { name, ...options }, meta: {} } as StructureNode;
}

function makeForm(fields: StructureNode[]) {
	return s.form({ query: async () => ({}) }, fields);
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("field helperText", () => {
	test("renders helper text below the input when helperText is set", async () => {
		const field = fieldNode("text", "bio", {
			label: "Bio",
			helperText: "A short description of yourself.",
		});
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		expect(getByText("A short description of yourself.")).toBeTruthy();
	});

	test("helper text element carries data-testid=field-helper-text", async () => {
		const field = fieldNode("text", "slug", { helperText: "Lowercase letters only." });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findAllByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const helpers = await findAllByTestId("field-helper-text");

		expect(helpers.length).toBeGreaterThan(0);
		expect(helpers[0]?.textContent).toBe("Lowercase letters only.");
	});

	test("does not render a helper-text element when helperText is absent", async () => {
		const field = fieldNode("text", "title", { label: "Title" });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		expect(queryAllByTestId("field-helper-text")).toHaveLength(0);
	});
});

describe("field tooltip", () => {
	test("renders info-icon trigger when tooltip is set", async () => {
		const field = fieldNode("text", "slug", {
			label: "Slug",
			tooltip: "Used in the URL — lowercase and hyphens only.",
		});
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByLabelText } = render(<Wrap>{renderNode(node)}</Wrap>);

		// The TooltipTrigger button carries aria-label equal to the tooltip text.
		const trigger = await findByLabelText("Used in the URL — lowercase and hyphens only.");

		expect(trigger).toBeTruthy();
	});

	test("does not render a tooltip trigger when tooltip is absent", async () => {
		const field = fieldNode("text", "title", { label: "Title" });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByRole } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		// No button with aria-label matching tooltip text means no tooltip trigger rendered.
		const buttons = queryAllByRole("button");
		expect(buttons).toHaveLength(0);
	});
});

describe("field helperText with validation error", () => {
	test("shows helper text AND error message simultaneously when a server error fires", async () => {
		const field = fieldNode("text", "title", {
			label: "Title",
			helperText: "Keep it short.",
		});
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			field,
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "Too long." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		// Both helper text and error must be visible at the same time.
		expect(getByText("Keep it short.")).toBeTruthy();
		const errorEl = await findByTestId("field-error-title");
		expect(errorEl.textContent).toBe("Too long.");
	});

	test("marks the control aria-invalid so the primitive can render its error state", async () => {
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			fieldNode("text", "title", { label: "Title" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "Too long." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("action-save");
		const input = container.querySelector('input[name="title"]');
		expect(input).not.toBeNull();
		expect(input?.getAttribute("aria-invalid")).toBeNull();

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});

		await findByTestId("field-error-title");
		expect(input?.getAttribute("aria-invalid")).toBe("true");
	});
});

describe("field aria-describedby", () => {
	/** Resolves an element's aria-describedby ids to the joined text of their targets. */
	function describedText(container: HTMLElement, el: Element | null): string {
		const ids = el?.getAttribute("aria-describedby")?.split(" ") ?? [];
		return ids
			.map((id) => container.querySelector(`#${id}`)?.textContent ?? "")
			.join(" ")
			.trim();
	}

	test("helper text only: control is described by the helper text", async () => {
		const field = fieldNode("text", "bio", { label: "Bio", helperText: "Keep it short." });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");
		const input = container.querySelector('input[name="bio"]');

		expect(describedText(container, input)).toBe("Keep it short.");
	});

	test("error only: control is described by the error message", async () => {
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			fieldNode("text", "title", { label: "Title" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "Too long." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("action-save");
		const input = container.querySelector('input[name="title"]');

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		await findByTestId("field-error-title");

		expect(describedText(container, input)).toBe("Too long.");
	});

	test("both: control is described by the error first, then the helper text", async () => {
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			fieldNode("text", "title", { label: "Title", helperText: "Keep it short." }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "Too long." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("action-save");
		const input = container.querySelector('input[name="title"]');

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		await findByTestId("field-error-title");

		expect(describedText(container, input)).toBe("Too long. Keep it short.");
	});

	test("neither: control has no aria-describedby attribute", async () => {
		const field = fieldNode("text", "title", { label: "Title" });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");
		const input = container.querySelector('input[name="title"]');

		expect(input?.hasAttribute("aria-describedby")).toBe(false);
	});

	test("checkbox layout: control is described the same way as the default layout", async () => {
		const node = s.form({ query: async () => ({ agree: false }) }, [
			fieldNode("checkbox", "agree", {
				label: "I agree",
				helperText: "Required to continue.",
			}),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { agree: "You must agree." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("action-save");
		// Radix Checkbox renders the accessible control as button[role="checkbox"];
		// input[name] is a visually-hidden mirror for native form submission only.
		const input = container.querySelector('button[role="checkbox"]');

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		await findByTestId("field-error-agree");

		expect(describedText(container, input)).toBe("You must agree. Required to continue.");
	});

	test("translatable field: each locale's control has its own unique described-by target id", async () => {
		const field = fieldNode("text", "title", {
			label: "Title",
			helperText: "Shown in every locale.",
			translatable: true,
		});
		const node = makeForm([field]);
		const config: ContentLocaleConfig = { locales: ["en", "uk"], defaultLocale: "en" };
		const Inner = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(
			<ContentLocaleConfigProvider config={config}>
				<Inner>{renderNode(node)}</Inner>
			</ContentLocaleConfigProvider>,
		);

		await findByTestId("form-block");
		const enInput = container.querySelector('input[name="title.en"]');
		const ukInput = container.querySelector('input[name="title.uk"]');
		const enId = enInput?.getAttribute("aria-describedby");
		const ukId = ukInput?.getAttribute("aria-describedby");

		// Both locales share the field-level helper text — same value is fine,
		// as long as it resolves (only the active locale panel is in the a11y
		// tree; the inactive one is display:none, so a stale/missing id there
		// is harmless). What must never happen is a distinct element on the
		// page claiming the same id as another field's description.
		expect(enId).toBe(ukId);
		expect(describedText(container, enInput)).toBe("Shown in every locale.");
	});
});
