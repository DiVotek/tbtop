import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import { materialize } from "./materialize";

/**
 * Build a server-authored StructureNode as PHP would emit it:
 * meta carries the raw wire condition (plain object, no ConditionFn).
 */
function serverNode(
	kind: string,
	options: Record<string, unknown>,
	name: string,
	meta: Record<string, unknown> = {},
): StructureNode {
	return { kind, options, meta, name } as unknown as StructureNode;
}

const BASE = { basePath: "/admin/test", data: { main: { type: "text", status: "draft" } } };

describe("ConditionFormBlock: hiddenIf via materialize", () => {
	test("ConditionFormBlock: field is absent when hiddenIf condition is satisfied", async () => {
		const form = serverNode(
			"form",
			{
				name: "main",
				children: [
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
					serverNode("text", { label: "Video URL" }, "video_url", {
						hiddenIf: { op: "neq", field: "type", value: "video" },
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, BASE);
		const Wrap = wrap(() => new Response("{}"));
		const { queryByLabelText, findByTestId } = render(<Wrap>{renderNode(materialized)}</Wrap>);

		await findByTestId("form-block");

		// type is "text" in initial data, so video_url (hiddenIf type != video) should be hidden
		expect(queryByLabelText("Video URL")).toBeNull();
	});

	test("ConditionFormBlock: field is present when hiddenIf condition is not satisfied", async () => {
		const data = { main: { type: "video" } };
		const form = serverNode(
			"form",
			{
				name: "main",
				children: [
					serverNode("text", { label: "Video URL" }, "video_url", {
						hiddenIf: { op: "neq", field: "type", value: "video" },
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, { basePath: "/admin/test", data });
		const Wrap = wrap(() => new Response("{}"));
		const { queryByLabelText, findByTestId } = render(<Wrap>{renderNode(materialized)}</Wrap>);

		await findByTestId("form-block");

		expect(queryByLabelText("Video URL")).not.toBeNull();
	});
});

describe("ConditionFormBlock: disabledIf via materialize", () => {
	test("ConditionFormBlock: field input is disabled when disabledIf condition is satisfied", async () => {
		const data = { main: { status: "archived", published_at: null } };
		const form = serverNode(
			"form",
			{
				name: "main",
				children: [
					serverNode("text", { label: "Caption" }, "caption", {
						disabledIf: {
							op: "all",
							conds: [
								{ op: "eq", field: "status", value: "archived" },
								{ op: "empty", field: "published_at" },
							],
						},
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, { basePath: "/admin/test", data });
		const Wrap = wrap(() => new Response("{}"));
		const { findByLabelText } = render(<Wrap>{renderNode(materialized)}</Wrap>);

		const input = await findByLabelText("Caption");
		expect(input.getAttribute("disabled")).not.toBeNull();
	});

	test("ConditionFormBlock: field input is not disabled when disabledIf condition is not satisfied", async () => {
		const data = { main: { status: "draft", published_at: null } };
		const form = serverNode(
			"form",
			{
				name: "main",
				children: [
					serverNode("text", { label: "Caption" }, "caption", {
						disabledIf: {
							op: "all",
							conds: [
								{ op: "eq", field: "status", value: "archived" },
								{ op: "empty", field: "published_at" },
							],
						},
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, { basePath: "/admin/test", data });
		const Wrap = wrap(() => new Response("{}"));
		const { findByLabelText } = render(<Wrap>{renderNode(materialized)}</Wrap>);

		const input = await findByLabelText("Caption");
		expect(input.getAttribute("disabled")).toBeNull();
	});
});
