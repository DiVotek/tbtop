/**
 * fillRowTemplate substitutes `{row.key}` placeholders in a visit action's
 * href with the matching row value. Row values are consumer data (slugs,
 * titles, ids from arbitrary tables) and must not be able to change the
 * template's own URL structure — a `/`, `?`, `#`, or `&` in the value must
 * stay confined to the single segment the template placed it in.
 */
import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { AdminClient } from "../data/client";
import { useFormController } from "../structure/formController";
import type { ClientActionContext, NodeMeta, StructureNode } from "../structure/types";
import { materializeActionOptions } from "./materializeActions";

const META: NodeMeta = {} as NodeMeta;

function visitNode(href: string): StructureNode {
	return {
		kind: "action",
		name: "edit",
		meta: META,
		options: { spec: { type: "visit", href } },
	};
}

function resolveUrl(href: string, row: Record<string, unknown>): string {
	const options = materializeActionOptions(visitNode(href), {
		basePath: "/admin",
		materializeNode: (node) => node,
	});
	const url = options.url;
	if (typeof url !== "function") {
		throw new TypeError("expected a templated url function");
	}
	return url({ row } as ClientActionContext);
}

function modalNode(spec: Record<string, unknown>): StructureNode {
	return {
		kind: "action",
		name: "quickCreate",
		meta: META,
		options: { spec },
	};
}

function materializeModal(spec: Record<string, unknown>): Record<string, unknown> {
	const options = materializeActionOptions(modalNode(spec), {
		basePath: "/admin",
		materializeNode: (node) => node,
	});
	const modal = options.modal;
	if (!modal || typeof modal !== "object") {
		throw new TypeError("expected a materialized modal");
	}
	return modal as Record<string, unknown>;
}

describe("materializeModal", () => {
	// Regression: the PHP DSL serializes slideOver() and modalWidth() into the
	// wire spec, but the client dropped them during materialization — a
	// slide-over action silently rendered as a centered dialog and a widened
	// modal opened at the default size.
	test("carries size and slideOver from the wire spec", () => {
		const modal = materializeModal({
			type: "modal",
			title: "Quick create",
			size: "2xl",
			slideOver: true,
		});
		expect(modal.title).toBe("Quick create");
		expect(modal.size).toBe("2xl");
		expect(modal.slideOver).toBe(true);
	});

	test("leaves size and slideOver undefined when the spec omits them", () => {
		const modal = materializeModal({ type: "modal", title: "Plain" });
		expect(modal.size).toBeUndefined();
		expect(modal.slideOver).toBeUndefined();
	});
});

describe("fillRowTemplate", () => {
	test("a slug containing '/' stays inside its own segment", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", { slug: "a/b" })).toBe("/posts/a%2Fb/edit");
	});

	test("a value containing '?' and '&' cannot start a query string", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", { slug: "a?x=1&y=2" })).toBe(
			"/posts/a%3Fx%3D1%26y%3D2/edit",
		);
	});

	test("a value containing '#' cannot start a fragment", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", { slug: "a#b" })).toBe("/posts/a%23b/edit");
	});

	test("an ordinary value is unchanged", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", { slug: "hello-world_1.0~x" })).toBe(
			"/posts/hello-world_1.0~x/edit",
		);
	});

	test("a missing row key still substitutes an empty string", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", {})).toBe("/posts//edit");
	});

	test("a lone surrogate does not crash the url resolver", () => {
		expect(() => resolveUrl("/posts/{row.slug}/edit", { slug: "\uD800" })).not.toThrow();
	});

	test("a valid surrogate pair is still encoded correctly", () => {
		expect(resolveUrl("/posts/{row.slug}/edit", { slug: "a😀b" })).toBe(
			"/posts/a%F0%9F%98%80b/edit",
		);
	});
});

// ---------------------------------------------------------------------------
// serverHandler's post-save reset. A server action that consumed the form
// (needs:['form']) marks it clean afterwards so a redirect effect is not
// blocked by the unsaved-changes guard. Two effects opt out of that reset,
// and both are load-bearing: without the opt-out the reset runs BEFORE the
// effects and discards what they were about to do.
// ---------------------------------------------------------------------------

function serverActionNode(needs: string[]): StructureNode {
	return {
		kind: "action",
		name: "recalculate",
		meta: META,
		options: { spec: { type: "server", needs } },
	};
}

function serverHandlerFor(needs: string[]): (ctx: ClientActionContext) => Promise<void> {
	const options = materializeActionOptions(serverActionNode(needs), {
		basePath: "/admin",
		materializeNode: (node) => node,
	});
	const handler = options.handler;
	if (typeof handler !== "function") {
		throw new TypeError("expected a server action handler");
	}
	return handler as (ctx: ClientActionContext) => Promise<void>;
}

function clientReturning(effects: unknown[]): AdminClient {
	return {
		post: () => Promise.resolve({ effects }),
	} as unknown as AdminClient;
}

async function runServerAction(input: {
	needs: string[];
	effects: unknown[];
	initial: Record<string, unknown>;
	typed?: Record<string, unknown>;
}) {
	const form = renderHook(() => useFormController({ initial: input.initial })).result;
	// Unsaved input the user typed before triggering the action.
	act(() => {
		for (const [field, value] of Object.entries(input.typed ?? {})) {
			form.current.set(field, value);
		}
	});
	const handler = serverHandlerFor(input.needs);
	await act(async () => {
		await handler({
			client: clientReturning(input.effects),
			form: form.current,
			notify: () => {},
		} as unknown as ClientActionContext);
	});
	return form;
}

describe("serverHandler: post-save reset", () => {
	test("a setFormData effect leaves the rest of the user's unsaved input intact", async () => {
		// The reset does not clobber the written key itself (a later `set`
		// wins over an earlier `reset` in React's update queue) — it wipes
		// every OTHER unsaved key back to initial and clears `touched`. That
		// is what the setFormData opt-out actually protects.
		const form = await runServerAction({
			needs: ["form"],
			effects: [{ kind: "setFormData", data: { total: 42 } }],
			initial: { total: 0, note: "" },
			typed: { note: "user typed this" },
		});

		expect(form.current.data).toEqual({ total: 42, note: "user typed this" });
		expect(form.current.isDirty).toBe(true);
	});

	test("a haltModal effect keeps the user's unsaved input instead of resetting it", async () => {
		const form = await runServerAction({
			needs: ["form"],
			effects: [{ kind: "haltModal", message: "Cannot save" }],
			initial: { title: "Old" },
			typed: { title: "Typed" },
		});

		expect(form.current.data).toEqual({ title: "Typed" });
		expect(form.current.isDirty).toBe(true);
	});

	test("without a keep-form effect the form is reset to initial after the action", async () => {
		const form = await runServerAction({
			needs: ["form"],
			effects: [{ kind: "notify", message: "Saved" }],
			initial: { title: "Old" },
			typed: { title: "Typed" },
		});

		expect(form.current.data).toEqual({ title: "Old" });
		expect(form.current.isDirty).toBe(false);
	});
});
