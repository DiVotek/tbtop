import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { wrapForStructure } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import type { FetchHandler } from "../testFixtures";
import { clickIsNative } from "../testing/clickIsNative";
import { clearBlockRegistry } from "./blockRegistry";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { renderNode } from "./structureRenderer";

// Stub the Inertia visit so a same-origin link click is observable without a live page.
const router = inertiaReact.router as unknown as Record<string, unknown>;
let previousVisit: unknown;
let visitMock: ReturnType<typeof mock>;

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
	previousVisit = router.visit;
	visitMock = mock(() => {});
	router.visit = visitMock;
});

afterEach(() => {
	clearBlockRegistry();
	if (previousVisit === undefined) {
		delete router.visit;
	} else {
		router.visit = previousVisit;
	}
});

const text: StructureNode = { kind: "displayText", options: { content: "hello" }, meta: {} };

function section(options: Record<string, unknown>): StructureNode {
	return { kind: "section", options: { children: [text], ...options }, meta: {} };
}

function serverAction(name: string, label: string): StructureNode {
	return {
		kind: "action",
		name,
		options: { label, spec: { type: "server", needs: [] } },
		meta: {},
	};
}

const noFetch: FetchHandler = async () => Response.json({});

function renderMaterialized(node: StructureNode, handler: FetchHandler = noFetch) {
	const Wrap = wrapForStructure(handler);
	const materialized = materialize(node, { basePath: "/admin/posts", data: {} });
	return render(<Wrap>{renderNode(materialized)}</Wrap>);
}

describe("linked section", () => {
	test("a same-origin url is an Inertia link to that url", () => {
		const { getByTestId } = render(
			renderNode(section({ title: "Orders", url: "/admin/orders" })),
		);
		const link = getByTestId("section-link");
		expect(link.getAttribute("href")).toBe("/admin/orders");
		expect(link.contains(getByTestId("section-block"))).toBe(true);
		expect(clickIsNative(link)).toBe(false);
		expect(visitMock).toHaveBeenCalled();
	});

	test("an off-origin url is a native link", () => {
		const { getByTestId } = render(
			renderNode(section({ title: "Docs", url: "https://example.com/docs" })),
		);
		const link = getByTestId("section-link");
		expect(link.getAttribute("target")).toBeNull();
		expect(clickIsNative(link)).toBe(true);
		expect(visitMock).not.toHaveBeenCalled();
	});

	test("newTab opens a same-origin url natively in a new tab", () => {
		const { getByTestId } = render(
			renderNode(section({ title: "Orders", url: "/admin/orders", newTab: true })),
		);
		const link = getByTestId("section-link");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
		expect(clickIsNative(link)).toBe(true);
		expect(visitMock).not.toHaveBeenCalled();
	});
});

describe("section header actions", () => {
	test("a section with actions and no title renders a header row with the actions", () => {
		const { getByTestId, getByRole } = renderMaterialized(
			section({ actions: [serverAction("export", "Export")] }),
		);
		const header = getByTestId("section-actions");
		expect(header.contains(getByRole("button", { name: "Export" }))).toBe(true);
	});

	test("an empty actions list does not force a header", () => {
		const { queryByTestId } = renderMaterialized(section({ actions: [] }));
		expect(queryByTestId("section-actions")).toBeNull();
	});

	test("a handle() action in the header posts to its bound endpoint", async () => {
		const user = userEvent.setup();
		const actionUrls: string[] = [];
		const handler: FetchHandler = async (req) => {
			if (req.url.includes("/actions/")) {
				actionUrls.push(req.url);
			}
			return Response.json({ effects: [] });
		};
		const { getByRole } = renderMaterialized(
			section({ title: "Posts", actions: [serverAction("export", "Export")] }),
			handler,
		);

		await user.click(getByRole("button", { name: "Export" }));

		await waitFor(() => expect(actionUrls.length).toBe(1));
		expect(actionUrls[0]).toContain("/admin/posts/actions/export");
	});
});
