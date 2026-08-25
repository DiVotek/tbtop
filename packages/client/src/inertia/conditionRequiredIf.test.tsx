import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/**
 * The label injects a "*" span when required, which changes the field
 * label's accessible name — so asserting the asterisk queries the field's
 * data-field-name container directly rather than via findByLabelText.
 */
function fieldAsterisk(container: HTMLElement, fieldName: string): Element | null {
	const field = container.querySelector(`[data-field-name="${fieldName}"]`);
	return field?.querySelector(".text-destructive") ?? null;
}

describe("ConditionFormBlock: requiredIf via materialize", () => {
	test("ConditionFormBlock: asterisk absent when requiredIf condition is not satisfied", async () => {
		const data = { main: { type: "person", company_name: "" } };
		const form = serverNode(
			"form",
			{
				children: [
					serverNode("text", { label: "Company name" }, "company_name", {
						requiredIf: { op: "eq", field: "type", value: "company" },
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, { basePath: "/admin/test", data });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(materialized)}</Wrap>);
		await findByTestId("form-block");

		expect(fieldAsterisk(container, "company_name")).toBeNull();
	});

	test("ConditionFormBlock: asterisk present when requiredIf condition is satisfied", async () => {
		const data = { main: { type: "company", company_name: "" } };
		const form = serverNode(
			"form",
			{
				children: [
					serverNode("text", { label: "Company name" }, "company_name", {
						requiredIf: { op: "eq", field: "type", value: "company" },
					}),
				],
			},
			"main",
		);

		const materialized = materialize(form, { basePath: "/admin/test", data });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(materialized)}</Wrap>);
		await findByTestId("form-block");

		expect(fieldAsterisk(container, "company_name")).not.toBeNull();
	});

	test("ConditionFormBlock: asterisk toggles live as the condition field's value changes", async () => {
		const form = serverNode(
			"form",
			{
				children: [
					serverNode("text", { label: "Type" }, "type"),
					serverNode("text", { label: "Company name" }, "company_name", {
						requiredIf: { op: "eq", field: "type", value: "company" },
					}),
				],
			},
			"main",
		);
		const materialized = materialize(form, {
			basePath: "/admin/test",
			data: { main: { type: "person", company_name: "" } },
		});

		const user = userEvent.setup();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, findByLabelText, container } = render(
			<Wrap>{renderNode(materialized)}</Wrap>,
		);
		await findByTestId("form-block");

		expect(fieldAsterisk(container, "company_name")).toBeNull();

		const typeInput = await findByLabelText("Type");
		await user.clear(typeInput);
		await user.type(typeInput, "company");

		await waitFor(() => {
			expect(fieldAsterisk(container, "company_name")).not.toBeNull();
		});

		await user.clear(typeInput);
		await user.type(typeInput, "person");

		await waitFor(() => {
			expect(fieldAsterisk(container, "company_name")).toBeNull();
		});
	});

	test("ConditionFormBlock: static options.required still shows the asterisk with no requiredIf", async () => {
		const form = serverNode(
			"form",
			{
				children: [serverNode("text", { label: "Title", required: true }, "title")],
			},
			"main",
		);
		const materialized = materialize(form, { basePath: "/admin/test", data: { main: {} } });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(materialized)}</Wrap>);
		await findByTestId("form-block");

		expect(fieldAsterisk(container, "title")).not.toBeNull();
	});
});
