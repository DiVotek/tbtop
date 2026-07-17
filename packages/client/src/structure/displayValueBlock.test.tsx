/**
 * Audit 5.24: DisplayValueBlock's icon kind delegates to IconMapCell, which
 * only read entry.icon — a bare icon-name string entry (documented as valid
 * by DisplayValueBlock::icon()'s own PHP docblock: array{icon, color?}|string)
 * silently rendered as text instead of an icon. Covers the DisplayValueBlock
 * call site specifically, in addition to the IconMapCell unit tests in
 * table/cellHelpers.test.tsx.
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { RenderContext } from "../render/blockRegistry";
import { DisplayValueBlock } from "./displayValueBlock";

const ctx: RenderContext = { surface: "cell" };

describe("DisplayValueBlock icon kind", () => {
	test("a bare string iconMap entry renders an icon, not the literal text", () => {
		const { container, queryByText } = render(
			<DisplayValueBlock
				options={{ value: "pencil", kind: "icon", iconMap: { pencil: "pencil" } }}
				meta={{}}
				ctx={ctx}
				renderChild={() => null}
			/>,
		);
		expect(container.querySelector("svg")).not.toBeNull();
		expect(queryByText("pencil")).toBeNull();
	});

	test("an object iconMap entry still works (no regression)", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{
					value: "active",
					kind: "icon",
					iconMap: { active: { icon: "check", color: "success" } },
				}}
				meta={{}}
				ctx={ctx}
				renderChild={() => null}
			/>,
		);
		const icon = container.querySelector("svg");
		expect(icon).not.toBeNull();
		expect(icon?.getAttribute("class")).toContain("text-success");
	});
});

/**
 * Audit 5.25: DisplayValueBlock rendered a plain value in a bare <span>,
 * with no whitespace-pre-line — a multiline string (e.g. an Inbox payload
 * baked as "key: value\nkey: value") collapsed onto one line. options.multiline
 * (set via the PHP DSL's ->multiline()) opts a block into pre-line rendering.
 */
describe("DisplayValueBlock multiline", () => {
	test("multiline:true renders newlines with whitespace-pre-line", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{ value: "key: value\nother: value2", multiline: true }}
				meta={{}}
				ctx={ctx}
				renderChild={() => null}
			/>,
		);
		const span = container.querySelector("span.whitespace-pre-line");
		expect(span).not.toBeNull();
		expect(span?.textContent).toBe("key: value\nother: value2");
	});

	test("without multiline, no whitespace-pre-line class is applied (no regression)", () => {
		const { container } = render(
			<DisplayValueBlock
				options={{ value: "single line" }}
				meta={{}}
				ctx={ctx}
				renderChild={() => null}
			/>,
		);
		expect(container.querySelector("span.whitespace-pre-line")).toBeNull();
	});
});
