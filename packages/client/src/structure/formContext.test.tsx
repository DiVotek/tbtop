import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// The public package surface is the seam under test: a consumer's custom
// block must be able to reach the nearest form through the root exports.
import { registerBlock, useNearestFormController } from "../index";
import { materialize } from "../inertia/materialize";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

ensureBuiltinsRegistered();

function SubtotalBlock() {
	const ctrl = useNearestFormController();
	const title = typeof ctrl?.data.title === "string" ? ctrl.data.title : "";
	return <output data-testid="subtotal">{`Chars: ${title.length}`}</output>;
}

registerBlock<"demo:subtotal", Record<string, never>>({
	kind: "demo:subtotal",
	behavior: "leaf",
	render: SubtotalBlock,
});

function pageStructure(): StructureNode {
	return {
		kind: "form",
		name: "post",
		options: {
			name: "post",
			children: [
				{ kind: "text", name: "title", options: { label: "Title" }, meta: {} },
				{ kind: "demo:subtotal", options: {}, meta: {} },
			],
		},
		meta: {},
	} as StructureNode;
}

describe("useNearestFormController as a public extension point", () => {
	test("a registered custom block inside a form reads live values as the user types", async () => {
		const user = userEvent.setup();
		const materialized = materialize(pageStructure(), {
			basePath: "/admin/posts",
			data: { post: { title: "Hi" } },
		});
		const Wrap = wrap(async () => Response.json({}));
		const { getByLabelText, findByTestId } = render(<Wrap>{renderNode(materialized)}</Wrap>);

		const subtotal = await findByTestId("subtotal");
		expect(subtotal.textContent).toBe("Chars: 2");

		await user.type(getByLabelText("Title"), "!!!");

		expect(subtotal.textContent).toBe("Chars: 5");
	});
});
