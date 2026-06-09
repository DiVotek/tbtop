import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

describe("Helper blocks rendering", () => {
	test("HelperBlocks divider renders an <hr> element", () => {
		const { container } = render(renderNode(s.divider()));
		expect(container.querySelector("hr")).toBeTruthy();
	});

	test("HelperBlocks heading renders <h3> by default", () => {
		const { container } = render(renderNode(s.heading({ text: "Section title" })));
		const h3 = container.querySelector("h3");
		expect(h3?.textContent).toBe("Section title");
	});

	test("HelperBlocks heading renders <h2> when level is 2", () => {
		const { container } = render(renderNode(s.heading({ text: "X", level: 2 })));
		expect(container.querySelector("h2")?.textContent).toBe("X");
	});

	test("HelperBlocks heading renders <h4> when level is 4", () => {
		const { container } = render(renderNode(s.heading({ text: "X", level: 4 })));
		expect(container.querySelector("h4")?.textContent).toBe("X");
	});

	test("HelperBlocks description renders a <p> with muted styling", () => {
		const text = "These fields are visible only to admins.";
		const { container } = render(renderNode(s.description({ text })));
		const p = container.querySelector("p");
		expect(p?.textContent).toBe(text);
		expect(p?.className).toContain("text-muted-foreground");
		expect(p?.className).toContain("text-sm");
	});
});

describe("Helper blocks hidden predicate", () => {
	test("HelperBlocks hidden true omits each helper from the DOM", () => {
		const stack = s.stack([
			s.divider({ hidden: () => true }),
			s.heading({ text: "H", hidden: () => true }),
			s.description({ text: "D", hidden: () => true }),
		]);
		const { container } = render(renderNode(stack));
		expect(container.querySelector("hr")).toBeNull();
		expect(container.querySelector("h3")).toBeNull();
		expect(container.querySelector("p")).toBeNull();
	});

	test("HelperBlocks hidden false renders each helper into the DOM", () => {
		const stack = s.stack([
			s.divider({ hidden: () => false }),
			s.heading({ text: "H", hidden: () => false }),
			s.description({ text: "D", hidden: () => false }),
		]);
		const { container } = render(renderNode(stack));
		expect(container.querySelector("hr")).toBeTruthy();
		expect(container.querySelector("h3")?.textContent).toBe("H");
		expect(container.querySelector("p")?.textContent).toBe("D");
	});

	test("HelperBlocks hidden gate also omits a parent s.section from the DOM", () => {
		const section = s.section({ title: "Author", hidden: () => true }, [
			s.heading({ text: "H" }),
		]);
		const { container } = render(renderNode(section));
		expect(container.querySelector("section")).toBeNull();
		expect(container.querySelector("h3")).toBeNull();
	});
});

describe("Helper blocks integration with s.form", () => {
	test("HelperBlocks do not contribute keys to form data on submit", async () => {
		let seenData: unknown = null;
		const node = s.form({ query: async () => ({ title: "Hello" }) }, [
			s.divider(),
			s.heading({ text: "Author info" }),
			s.description({ text: "Visible to admins only." }),
			s.text({ name: "title" }),
			s.action({
				name: "save",
				handler: async (c) => {
					seenData = c.form?.data;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		expect(seenData).toEqual({ title: "Hello" });
	});

	test("HelperBlocks render inside s.form alongside fields", async () => {
		const node = s.form({ query: async () => ({ title: "Hello" }) }, [
			s.heading({ text: "Author info" }),
			s.divider(),
			s.description({ text: "Visible to admins only." }),
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(container.querySelector("h3")?.textContent).toBe("Author info");
		expect(container.querySelector("hr")).toBeTruthy();
		expect(container.querySelector("p")?.textContent).toBe("Visible to admins only.");
	});
});
