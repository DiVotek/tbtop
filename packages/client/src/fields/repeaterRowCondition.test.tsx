/**
 * Repeater row: scoped condition evaluation tests (slice B scenarios 2-4).
 * Tests run through the public rendering surface (formBlock + repeater).
 */
import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";

function serverNode(
	kind: string,
	options: Record<string, unknown>,
	name: string,
	meta: Record<string, unknown> = {},
): StructureNode {
	return { kind, options, meta, name } as unknown as StructureNode;
}

function makeRepeaterForm(
	data: Record<string, unknown>,
	subFields: StructureNode[],
): StructureNode {
	const form = serverNode(
		"form",
		{
			children: [
				serverNode("repeater", { label: "Sections", fields: subFields }, "sections"),
			],
		},
		"main",
	);
	return materialize(form, { basePath: "/admin/test", data: { main: data } });
}

// ---------------------------------------------------------------------------
// Scenario 2: item-local hiddenIf hides only in matching row
// ---------------------------------------------------------------------------
describe("RepeaterRow: item-local hiddenIf", () => {
	test("RepeaterRow: sub-field hidden only in row where item type is video", async () => {
		const subFields = [
			serverNode(
				"select",
				{
					label: "Type",
					options: [
						{ value: "text", label: "Text" },
						{ value: "video", label: "Video" },
					],
				},
				"type",
			),
			serverNode("text", { label: "URL" }, "url", {
				hiddenIf: { op: "eq", field: "type", value: "video" },
			}),
		];
		const form = makeRepeaterForm(
			{
				sections: [
					{ type: "text", url: "" },
					{ type: "video", url: "https://example.com" },
				],
			},
			subFields,
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByLabelText } = render(<Wrap>{renderNode(form)}</Wrap>);
		await findByTestId("form-block");

		// row 0 has type=text → URL field should be visible (not hidden)
		// row 1 has type=video → URL field should be hidden
		const urlInputs = queryAllByLabelText("URL");
		expect(urlInputs).toHaveLength(1);
	});

	test("RepeaterRow: when no row matches condition, all URL fields visible", async () => {
		const subFields = [
			serverNode("text", { label: "URL" }, "url", {
				hiddenIf: { op: "eq", field: "type", value: "video" },
			}),
		];
		const form = makeRepeaterForm(
			{
				sections: [
					{ type: "text", url: "" },
					{ type: "article", url: "" },
				],
			},
			subFields,
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByLabelText } = render(<Wrap>{renderNode(form)}</Wrap>);
		await findByTestId("form-block");

		const urlInputs = queryAllByLabelText("URL");
		expect(urlInputs).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Scenario 3: $root. condition reacts to top-level form field change
// ---------------------------------------------------------------------------
describe("RepeaterRow: $root. condition reacts to form-level field", () => {
	test("RepeaterRow: sub-field hidden when $root.status is draft", async () => {
		const subFields = [
			serverNode("text", { label: "Caption" }, "caption", {
				hiddenIf: { op: "eq", field: "$root.status", value: "draft" },
			}),
		];
		// status is draft → caption sub-fields should be hidden
		const form = makeRepeaterForm(
			{
				status: "draft",
				sections: [{ caption: "first" }, { caption: "second" }],
			},
			subFields,
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByLabelText } = render(<Wrap>{renderNode(form)}</Wrap>);
		await findByTestId("form-block");

		expect(queryAllByLabelText("Caption")).toHaveLength(0);
	});

	test("RepeaterRow: sub-field visible when $root.status is published", async () => {
		const subFields = [
			serverNode("text", { label: "Caption" }, "caption", {
				hiddenIf: { op: "eq", field: "$root.status", value: "draft" },
			}),
		];
		const form = makeRepeaterForm(
			{
				status: "published",
				sections: [{ caption: "first" }],
			},
			subFields,
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByLabelText } = render(<Wrap>{renderNode(form)}</Wrap>);
		await findByTestId("form-block");

		expect(queryAllByLabelText("Caption")).toHaveLength(1);
	});

	test("RepeaterRow: $root. condition re-evaluates when root text field changes", async () => {
		// Form has a text "status" field + repeater with sub-field hidden when $root.status=draft.
		// Typing "published" into the status input makes caption visible.
		const subFields = [
			serverNode("text", { label: "Caption" }, "caption", {
				hiddenIf: { op: "eq", field: "$root.status", value: "draft" },
			}),
		];
		const form = serverNode(
			"form",
			{
				children: [
					serverNode("text", { label: "Status" }, "status"),
					serverNode("repeater", { label: "Sections", fields: subFields }, "sections"),
				],
			},
			"main",
		);
		const materialized = materialize(form, {
			basePath: "/admin/test",
			data: { main: { status: "draft", sections: [{ caption: "" }] } },
		});

		const user = userEvent.setup();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByLabelText, getByLabelText } = render(
			<Wrap>{renderNode(materialized)}</Wrap>,
		);
		await findByTestId("form-block");

		// Initially caption is hidden (status=draft)
		expect(queryAllByLabelText("Caption")).toHaveLength(0);

		// Clear status and type "published"
		const statusInput = getByLabelText("Status") as HTMLInputElement;
		await user.clear(statusInput);
		await user.type(statusInput, "published");

		// Caption should now be visible (status no longer "draft")
		await waitFor(() => {
			expect(queryAllByLabelText("Caption")).toHaveLength(1);
		});
	});
});

// ---------------------------------------------------------------------------
// Scenario 4: item-local disabledIf reaches sub-field control
// ---------------------------------------------------------------------------
describe("RepeaterRow: item-local disabledIf", () => {
	test("RepeaterRow: sub-field disabled when item condition matches", async () => {
		const subFields = [
			serverNode("text", { label: "Title" }, "title", {
				disabledIf: { op: "eq", field: "locked", value: true },
			}),
		];
		const form = makeRepeaterForm(
			{
				sections: [
					{ title: "Locked item", locked: true },
					{ title: "Free item", locked: false },
				],
			},
			subFields,
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getAllByLabelText } = render(<Wrap>{renderNode(form)}</Wrap>);
		await findByTestId("form-block");

		const titleInputs = getAllByLabelText("Title") as HTMLInputElement[];
		expect(titleInputs).toHaveLength(2);
		// row 0: locked=true → disabled
		expect(titleInputs[0]?.disabled).toBe(true);
		// row 1: locked=false → not disabled
		expect(titleInputs[1]?.disabled).toBe(false);
	});
});
