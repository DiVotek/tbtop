import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import type { SerializedEditorState } from "lexical";
import { RichtextCell } from "./richtextCell";

function makeState(text: string): SerializedEditorState {
	return {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}

describe("RichtextCell", () => {
	it("renders a plain-text preview from a Lexical state", () => {
		const { container } = render(<RichtextCell value={makeState("Hello world")} />);
		expect(container.textContent).toBe("Hello world");
	});

	it("truncates long text to 80 chars and appends ellipsis", () => {
		const long = "a".repeat(100);
		const { container } = render(<RichtextCell value={makeState(long)} />);
		const text = container.textContent ?? "";
		expect(text.length).toBeLessThanOrEqual(82); // 80 + "…"
		expect(text.endsWith("…")).toBe(true);
	});

	it("renders nothing for null value", () => {
		const { container } = render(<RichtextCell value={null} />);
		expect(container.textContent).toBe("");
	});

	it("renders nothing when root has no text", () => {
		const empty = {
			root: {
				children: [],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "root",
				version: 1,
			},
		} as unknown as SerializedEditorState;
		const { container } = render(<RichtextCell value={empty} />);
		expect(container.textContent).toBe("");
	});
});
