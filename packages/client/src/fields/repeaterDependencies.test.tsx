/**
 * A repeater sub-field's dependsOn is row-relative: `select('value')
 * ->dependsOn('field')` reads `field` from ITS OWN row bag, never from the
 * root form (where the bare name would resolve to nothing forever).
 */
import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import type { FetchHandler } from "../testFixtures";

ensureBuiltinsRegistered();

interface OptionsCall {
	url: string;
	deps: Record<string, string> | undefined;
}

function pageStructure(): StructureNode {
	return {
		kind: "form",
		name: "rule",
		options: {
			name: "rule",
			children: [
				{
					kind: "repeater",
					name: "rules",
					options: {
						name: "rules",
						fields: [
							{ kind: "text", name: "field", options: { label: "Field" }, meta: {} },
							{
								kind: "select",
								name: "value",
								options: { label: "Value", async: true, dependsOn: ["field"] },
								meta: {},
							},
						],
					},
					meta: {},
				},
			],
		},
		meta: {},
	} as StructureNode;
}

function optionsHandler(calls: OptionsCall[]): FetchHandler {
	return async (req) => {
		const body = (await req.json()) as { deps?: Record<string, string> };
		calls.push({ url: req.url, deps: body.deps });
		return Response.json({ options: [{ value: "1", label: "One" }] });
	};
}

function mountPage(calls: OptionsCall[]) {
	const materialized = materialize(pageStructure(), {
		basePath: "/admin/collections",
		data: {
			rule: {
				rules: [
					{ field: "", value: null },
					{ field: "", value: null },
				],
			},
		},
	});
	const Wrap = wrap(optionsHandler(calls));
	return render(<Wrap>{renderNode(materialized)}</Wrap>);
}

function rowSelectInput(container: HTMLElement, row: number): HTMLInputElement {
	const el = container.querySelector(
		`[data-repeater-item="${row}"] [data-testid="select-search-value"]`,
	);
	if (!(el instanceof HTMLInputElement)) {
		throw new Error(`row ${row} select input missing`);
	}
	return el;
}

describe("repeater sub-field dependsOn", () => {
	test("typing into row 0's sibling readies row 0's select and posts the row's value; row 1 stays gated", async () => {
		const user = userEvent.setup();
		const calls: OptionsCall[] = [];
		const { container } = mountPage(calls);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(2),
		);
		expect(rowSelectInput(container, 0).disabled).toBe(true);
		expect(rowSelectInput(container, 1).disabled).toBe(true);

		const sibling = container.querySelector(
			'[data-repeater-item="0"] input[name="field"]',
		) as HTMLInputElement;
		await user.type(sibling, "sku");

		await waitFor(() => expect(rowSelectInput(container, 0).disabled).toBe(false));
		expect(rowSelectInput(container, 1).disabled).toBe(true);

		await waitFor(() => expect(calls.length).toBeGreaterThan(0));
		const last = calls.at(-1);
		expect(last?.url).toContain("/admin/collections/select-options/value");
		expect(last?.deps).toEqual({ field: "sku" });
	});
});
