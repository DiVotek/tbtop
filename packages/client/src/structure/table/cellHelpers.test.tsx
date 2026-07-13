/**
 * Regression: BooleanIconCell/IconMapCell render a bare icon on the page
 * background, not a badge — they must use ColorClasses.icon (paint color),
 * not .text (badge on-color, e.g. white for success).
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { TableColumn } from "../types";
import { BooleanIconCell, IconMapCell } from "./cellHelpers";

describe("BooleanIconCell", () => {
	test("true renders with the success icon color, not the badge text color", () => {
		const col = {} as TableColumn;
		const { container } = render(<BooleanIconCell value={true} col={col} />);
		const icon = container.querySelector("svg");
		expect(icon?.getAttribute("class")).toContain("text-success");
		expect(icon?.getAttribute("class")).not.toContain("text-success-foreground");
	});

	test("false renders with the muted icon color", () => {
		const col = {} as TableColumn;
		const { container } = render(<BooleanIconCell value={false} col={col} />);
		const icon = container.querySelector("svg");
		expect(icon?.getAttribute("class")).toContain("text-muted-foreground");
	});
});

describe("IconMapCell", () => {
	test("resolves the icon paint color, not the badge text color", () => {
		const col = {
			iconMap: { active: { icon: "check", color: "success" } },
		} as unknown as TableColumn;
		const { container } = render(<IconMapCell value="active" col={col} />);
		const icon = container.querySelector("svg");
		expect(icon?.getAttribute("class")).toContain("text-success");
		expect(icon?.getAttribute("class")).not.toContain("text-success-foreground");
	});
});
