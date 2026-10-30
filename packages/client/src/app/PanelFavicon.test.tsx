/**
 * PanelFavicon: the shared tbtop.favicon becomes a keyed <link rel="icon"> in
 * Inertia's <Head>. Head is mocked to render its children directly.
 */
import { describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

type PageProps = Record<string, unknown>;
let currentProps: PageProps = {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	usePage: () => ({ props: currentProps, url: "/admin", flash: {} }),
	Head: ({ children }: { children?: ReactNode }) => <div data-testid="head">{children}</div>,
}));

// Import after mock.module so the mock is in effect.
import { PanelFavicon } from "./PanelFavicon";

describe("PanelFavicon", () => {
	test("puts the panel favicon in the head under a stable key", () => {
		currentProps = { tbtop: { favicon: "/img/favicon.svg" } };
		render(<PanelFavicon />);

		// React 19 hoists a rendered <link> into document.head.
		const link = document.querySelector('link[rel="icon"]');
		expect(link?.getAttribute("href")).toBe("/img/favicon.svg");
		expect(link?.getAttribute("head-key")).toBe("favicon");
	});

	test("renders nothing when the panel sets no favicon", () => {
		currentProps = { tbtop: { favicon: null } };
		const { queryByTestId } = render(<PanelFavicon />);

		expect(queryByTestId("head")).toBeNull();
	});
});
