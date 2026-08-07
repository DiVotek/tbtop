import { afterEach, describe, expect, it } from "bun:test";
import { clearBlockRegistry, registerBlock } from "../render/blockRegistry";
import type { StructureNode } from "../structure/types";
import { materialize } from "./materialize";

const NOOP_RENDER = () => null;
const BASE_PATH = "/admin/posts/7";

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

function opts(n: StructureNode): Record<string, unknown> {
	const bag = n.options;
	if (!bag || typeof bag !== "object") {
		throw new Error("node has no options bag");
	}
	return bag as Record<string, unknown>;
}

function firstChild(n: StructureNode): StructureNode {
	const kids = opts(n).children;
	if (!Array.isArray(kids) || kids.length === 0) {
		throw new Error("node has no children");
	}
	return kids[0] as StructureNode;
}

afterEach(() => {
	clearBlockRegistry();
});

describe("materialize: registered third-party kinds", () => {
	it("runs the descriptor's materializer with the page basePath", () => {
		registerBlock({
			kind: "imageGallery",
			behavior: "field",
			render: NOOP_RENDER,
			materialize: (n, basePath) => ({
				...n,
				options: { ...opts(n), uploadEndpoint: `${basePath}/gallery-upload/${n.name}` },
			}),
		});

		const out = materialize(node("imageGallery", { async: true }, "banners"), {
			basePath: BASE_PATH,
			data: {},
		});

		expect(opts(out).uploadEndpoint).toBe("/admin/posts/7/gallery-upload/banners");
	});

	it("leaves a registered kind without a materializer untouched", () => {
		registerBlock({ kind: "plainCustom", behavior: "field", render: NOOP_RENDER });

		const out = materialize(node("plainCustom", { label: "Plain" }, "thing"), {
			basePath: BASE_PATH,
			data: {},
		});

		expect(opts(out)).toEqual({ label: "Plain" });
	});

	it("keeps compiling child conditions after the materializer runs", () => {
		registerBlock({
			kind: "galleryGroup",
			behavior: "container",
			render: NOOP_RENDER,
			materialize: (n) => ({ ...n, options: { ...opts(n), touched: true } }),
		});

		const child = node("text", {}, "caption");
		child.meta = {
			hiddenIf: { op: "eq", field: "mode", value: "off" },
		} as StructureNode["meta"];

		const out = materialize(node("galleryGroup", { children: [child] }), {
			basePath: BASE_PATH,
			data: {},
		});

		expect(opts(out).touched).toBe(true);
		expect(typeof firstChild(out).meta?.hidden).toBe("function");
	});
});
