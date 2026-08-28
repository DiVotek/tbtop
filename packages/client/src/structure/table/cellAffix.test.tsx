/**
 * Regression: an empty cell value must not render a lone prefix/suffix
 * (e.g. a bare "USD" with nothing to attach it to).
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { TableColumn } from "../types";
import { CellAffixes } from "./cellAffix";

function suffixCol(): TableColumn {
	return {
		suffix: { kind: "displayText", options: { content: "USD" } },
	} as unknown as TableColumn;
}

describe("CellAffixes", () => {
	test("does not render the suffix when the value is null", () => {
		const { container } = render(
			<CellAffixes col={suffixCol()} value={null}>
				{null}
			</CellAffixes>,
		);
		expect(container.textContent).not.toContain("USD");
	});

	test("does not render the suffix when the value is an empty string", () => {
		const { container } = render(
			<CellAffixes col={suffixCol()} value="">
				{""}
			</CellAffixes>,
		);
		expect(container.textContent).not.toContain("USD");
	});

	test("does not render the suffix when the value is undefined", () => {
		const { container } = render(
			<CellAffixes col={suffixCol()} value={undefined}>
				{null}
			</CellAffixes>,
		);
		expect(container.textContent).not.toContain("USD");
	});

	test("renders the suffix when the value is non-empty", () => {
		const { container } = render(
			<CellAffixes col={suffixCol()} value={1999}>
				{"19.99"}
			</CellAffixes>,
		);
		expect(container.textContent).toContain("USD");
		expect(container.textContent).toContain("19.99");
	});

	test("renders the suffix when the value is falsy but not empty (0)", () => {
		const { container } = render(
			<CellAffixes col={suffixCol()} value={0}>
				{"0"}
			</CellAffixes>,
		);
		expect(container.textContent).toContain("USD");
	});
});
