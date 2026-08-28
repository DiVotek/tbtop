/**
 * AdminErrorPage: status/title/message from props and the link back to the
 * panel root. Mocks only usePage + Head, mirroring AdminPageContent.test.tsx.
 */
import { describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: currentProps, url: "/admin/nope", flash: {} }),
	Head: () => null,
}));

// Import after mock.module so the mock is in effect.
import { AdminErrorPage } from "./AdminErrorPage";

describe("AdminErrorPage", () => {
	test("renders status, title, message and a link to the panel prefix", () => {
		currentProps = {
			status: 404,
			title: "Page not found",
			message: "Nothing here.",
			tbtop: { prefix: "/admin" },
		};
		const { getByRole, getByText } = render(<AdminErrorPage />);

		expect(getByText("404")).toBeTruthy();
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Page not found");
		expect(getByText("Nothing here.")).toBeTruthy();
		const link = getByRole("link", { name: "Back to the panel" });
		expect(link.getAttribute("href")).toBe("/admin");
	});

	test("falls back to the site root when no panel prefix is shared", () => {
		currentProps = { status: 404, title: "Page not found", message: "" };
		const { getByRole } = render(<AdminErrorPage />);
		expect(getByRole("link").getAttribute("href")).toBe("/");
	});
});
