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

	// Audit 5.24: Column::iconMap()/DisplayValueBlock::icon() (PHP) document
	// each entry as either { icon, color? } OR a bare icon-name string —
	// IconMapCell only read entry.icon, so a string entry (e.g. author-tracking's
	// { pencil: 'pencil' }) silently fell through the "unknown value" text
	// fallback and rendered the literal word "pencil" instead of an icon.
	test("a bare string entry (shorthand for {icon: entry}) renders the icon, not a text fallback", () => {
		const col = {
			iconMap: { pencil: "pencil" },
		} as unknown as TableColumn;
		const { container, queryByText } = render(<IconMapCell value="pencil" col={col} />);
		expect(container.querySelector("svg")).not.toBeNull();
		expect(queryByText("pencil")).toBeNull();
	});

	test("a string entry with no matching icon falls back to text (unknown icon name)", () => {
		const col = {
			iconMap: { weird: "not-a-real-icon-name" },
		} as unknown as TableColumn;
		const { container, getByText } = render(<IconMapCell value="weird" col={col} />);
		expect(container.querySelector("svg")).toBeNull();
		expect(getByText("weird")).toBeTruthy();
	});

	test("an object entry still works exactly as before (no regression)", () => {
		const col = {
			iconMap: { active: { icon: "check" } },
		} as unknown as TableColumn;
		const { container } = render(<IconMapCell value="active" col={col} />);
		expect(container.querySelector("svg")).not.toBeNull();
	});
});
