/**
 * fillRowTemplate substitutes `{row.key}` placeholders in a visit action's
 * href with the matching row value. Row values are consumer data (slugs,
 * titles, ids from arbitrary tables) and must not be able to change the
 * template's own URL structure — a `/`, `?`, `#`, or `&` in the value must
 * stay confined to the single segment the template placed it in.
 */
import { describe, expect, test } from "bun:test";
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
