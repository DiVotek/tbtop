import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { s } from "../structure/structure";
import type { StructureNode } from "../structure/types";
import { renderNode } from "./structureRenderer";

const originalUrl = window.location.href;

beforeEach(() => {
	window.history.replaceState(null, "", "/admin/posts/1/edit");
});

afterEach(() => {
	window.history.replaceState(null, "", originalUrl);
});

describe("named tabs URL state", () => {
	test("seeds the active tab from the URL", () => {
		window.history.replaceState(null, "", "/admin/posts/1/edit?tab%5Bpost%5D=seo");

		const { getByTestId, getByText, queryByText } = render(renderNode(namedTabs()));

		expect(getByTestId("tab-SEO").getAttribute("data-state")).toBe("active");
		expect(getByText("SEO panel")).toBeTruthy();
		expect(queryByText("General panel")).toBeNull();
	});

	test("mirrors selection while preserving unrelated query parameters", async () => {
		window.history.replaceState(null, "", "/admin/posts/1/edit?preview=1#form");
		const { getByTestId } = render(renderNode(namedTabs()));

		fireEvent.mouseDown(getByTestId("tab-SEO"));

		await waitFor(() => {
			expect(window.location.search).toContain("preview=1");
			expect(window.location.search).toContain("tab%5Bpost%5D=seo");
		});
		expect(window.location.hash).toBe("#form");

		fireEvent.mouseDown(getByTestId("tab-General"));
		await waitFor(() => expect(window.location.search).not.toContain("tab%5Bpost%5D"));
	});

	test("unknown tab names fall back to the default and are removed", async () => {
		window.history.replaceState(null, "", "/admin/posts/1/edit?tab%5Bpost%5D=missing");
		const { getByTestId } = render(renderNode(namedTabs()));

		expect(getByTestId("tab-General").getAttribute("data-state")).toBe("active");
		await waitFor(() => expect(window.location.search).toBe(""));
	});

	test("restores URL state after a same-page state-preserving redirect", async () => {
		const node = namedTabs();
		const { getByTestId, rerender } = render(renderNode(node));
		fireEvent.mouseDown(getByTestId("tab-SEO"));
		await waitFor(() => expect(window.location.search).toContain("tab%5Bpost%5D=seo"));

		window.history.replaceState(null, "", "/admin/posts/1/edit?saved=1");
		rerender(renderNode(node));

		await waitFor(() => {
			expect(window.location.search).toContain("saved=1");
			expect(window.location.search).toContain("tab%5Bpost%5D=seo");
		});
	});

	test("unnamed tabs remain index-based and do not modify the URL", () => {
		window.history.replaceState(null, "", "/admin/posts/1/edit?tab%5Bpost%5D=seo");
		const node = s.tabs([
			s.tab("General", panel("General panel")),
			s.tab("SEO", panel("SEO panel")),
		]);
		const { getByTestId } = render(renderNode(node));

		expect(getByTestId("tab-General").getAttribute("data-state")).toBe("active");
		fireEvent.mouseDown(getByTestId("tab-SEO"));
		expect(window.location.search).toBe("?tab%5Bpost%5D=seo");
	});

	test("an active tab is the URL default: selecting it clears the param, leaving it sets one", async () => {
		const node = s.tabs(
			[
				s.tab("General", panel("General panel"), { name: "general" }),
				s.tab("SEO", panel("SEO panel"), { name: "seo", active: true }),
			],
			{ name: "post" },
		);
		const { getByTestId } = render(renderNode(node));

		expect(getByTestId("tab-SEO").getAttribute("data-state")).toBe("active");
		expect(window.location.search).toBe("");

		fireEvent.mouseDown(getByTestId("tab-General"));
		await waitFor(() => expect(window.location.search).toBe("?tab%5Bpost%5D=general"));

		fireEvent.mouseDown(getByTestId("tab-SEO"));
		await waitFor(() => expect(window.location.search).toBe(""));
	});
});

function namedTabs(): StructureNode {
	return s.tabs(
		[
			s.tab("General", panel("General panel"), { name: "general" }),
			s.tab("SEO", panel("SEO panel"), { name: "seo" }),
		],
		{ name: "post" },
	);
}

function panel(content: string): StructureNode {
	return { kind: "displayText", options: { content }, meta: {} };
}
