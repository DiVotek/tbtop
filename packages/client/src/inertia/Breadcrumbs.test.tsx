import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
	test("Breadcrumbs: renders nothing when there is only one item", () => {
		const { container } = render(<Breadcrumbs items={[{ label: "Posts" }]} />);
		expect(container.firstChild).toBeNull();
	});

	test("Breadcrumbs: renders nothing when items array is empty", () => {
		const { container } = render(<Breadcrumbs items={[]} />);
		expect(container.firstChild).toBeNull();
	});

	test("Breadcrumbs: renders nav with aria-label when multiple items", () => {
		const { container } = render(
			<Breadcrumbs
				items={[{ label: "Content", url: "/admin/posts" }, { label: "Edit Post" }]}
			/>,
		);
		const nav = container.querySelector("nav");
		expect(nav).not.toBeNull();
		expect(nav?.getAttribute("aria-label")).toBe("Breadcrumb");
	});

	test("Breadcrumbs: last item has aria-current=page", () => {
		const { container } = render(
			<Breadcrumbs
				items={[{ label: "Content", url: "/admin/posts" }, { label: "Edit Post" }]}
			/>,
		);
		const spans = container.querySelectorAll("span");
		const current = Array.from(spans).find((s) => s.getAttribute("aria-current") === "page");
		expect(current).not.toBeNull();
		expect(current?.textContent).toBe("Edit Post");
	});

	test("Breadcrumbs: last item is not a link", () => {
		const { container } = render(
			<Breadcrumbs
				items={[{ label: "Content", url: "/admin/posts" }, { label: "Edit Post" }]}
			/>,
		);
		const links = container.querySelectorAll("a");
		// only the parent crumb is a link; last item is a span
		expect(links).toHaveLength(1);
		expect(links[0]?.textContent).toBe("Content");
	});

	test("Breadcrumbs: parent item with url renders as a link", () => {
		const { container } = render(
			<Breadcrumbs
				items={[
					{ label: "Content", url: "/admin/content" },
					{ label: "Posts", url: "/admin/posts" },
					{ label: "Edit Post" },
				]}
			/>,
		);
		const links = container.querySelectorAll("a");
		expect(links).toHaveLength(2);
		expect(links[0]?.getAttribute("href")).toBe("/admin/content");
		expect(links[1]?.getAttribute("href")).toBe("/admin/posts");
	});

	test("Breadcrumbs: parent item without url renders as plain text", () => {
		const { container } = render(
			<Breadcrumbs items={[{ label: "Content" }, { label: "Edit Post" }]} />,
		);
		const links = container.querySelectorAll("a");
		expect(links).toHaveLength(0);
		const spans = container.querySelectorAll("span");
		// Both items rendered as spans: no-url parent + current page
		expect(spans).toHaveLength(2);
	});

	test("Breadcrumbs: renders chevron separators between items", () => {
		const { container } = render(
			<Breadcrumbs
				items={[{ label: "Content", url: "/admin/posts" }, { label: "Edit Post" }]}
			/>,
		);
		// lucide ChevronRight renders as an svg
		const chevrons = container.querySelectorAll("svg");
		expect(chevrons.length).toBeGreaterThan(0);
	});
});
