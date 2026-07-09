/**
 * Tab::description() bridges to the page subtitle via PageSubtitleContext:
 * TableBlock pushes the active tab's description into the context; AdminPage
 * reads it (see inertia/AdminPage.tsx's PageSubtitle). This exercises the
 * same context contract directly, through the real materialize()/renderNode()
 * path, mirroring tableBlockTabs.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { PageSubtitleProvider, usePageSubtitle } from "./pageSubtitleContext";
import { wrapForStructure } from "./testFixtures";
import type { StructureNode } from "./types";

let originalReplaceState: typeof window.history.replaceState;

beforeEach(() => {
	originalReplaceState = window.history.replaceState.bind(window.history);
	originalReplaceState(null, "", "http://localhost/");
});

afterEach(() => {
	window.history.replaceState = originalReplaceState;
	originalReplaceState(null, "", "http://localhost/");
});

function describedTabsNode(): StructureNode {
	return {
		kind: "table",
		name: "posts",
		options: {
			columns: [{ name: "title", label: "Title" }],
			tabs: [
				{ name: "all", label: "All", count: false, description: "Every post" },
				{ name: "published", label: "Published", count: false },
			],
		},
		meta: {},
	};
}

function materializeDescribedTabs(): StructureNode {
	return materialize(describedTabsNode(), { basePath: "/admin/posts", data: {} });
}

function rowsResponse(): Response {
	return new Response(JSON.stringify({ data: { data: [{ id: "1", title: "A" }], total: 1 } }));
}

/** Mirrors AdminPage's PageSubtitle: renders the context value as visible text. */
function SubtitleProbe() {
	const subtitle = usePageSubtitle();
	return <p data-testid="subtitle-probe">{subtitle ?? "(none)"}</p>;
}

function renderWithSubtitleProbe(
	node: StructureNode,
	handler: Parameters<typeof wrapForStructure>[0],
) {
	const Wrap = wrapForStructure(handler);
	return render(
		<Wrap>
			<PageSubtitleProvider>
				<SubtitleProbe />
				{renderNode(node)}
			</PageSubtitleProvider>
		</Wrap>,
	);
}

describe("Table tab description -> page subtitle bridge", () => {
	test("the first (default) tab's description is pushed on mount", async () => {
		const { findByTestId } = renderWithSubtitleProbe(materializeDescribedTabs(), () =>
			rowsResponse(),
		);
		await findByTestId("table-tabs");
		const probe = await findByTestId("subtitle-probe");
		expect(probe.textContent).toBe("Every post");
	});

	test("switching to a tab without a description clears the subtitle", async () => {
		const user = userEvent.setup({ delay: null });
		const { findByTestId } = renderWithSubtitleProbe(materializeDescribedTabs(), () =>
			rowsResponse(),
		);
		const publishedTab = await findByTestId("table-tab-published");

		await act(async () => {
			await user.click(publishedTab);
		});

		await waitFor(async () => {
			const probe = await findByTestId("subtitle-probe");
			expect(probe.textContent).toBe("(none)");
		});
	});

	test("a table with no tab descriptions never sets a subtitle", async () => {
		const node = materialize(
			{
				kind: "table",
				name: "posts",
				options: {
					columns: [{ name: "title", label: "Title" }],
					tabs: [{ name: "all", label: "All", count: false }],
				},
				meta: {},
			},
			{ basePath: "/admin/posts", data: {} },
		);
		const { findByTestId } = renderWithSubtitleProbe(node, () => rowsResponse());
		await findByTestId("table-tabs");
		const probe = await findByTestId("subtitle-probe");
		expect(probe.textContent).toBe("(none)");
	});

	test("unmounting the table clears the subtitle it set", async () => {
		const node = materializeDescribedTabs();
		const Wrap = wrapForStructure(() => rowsResponse());

		function Harness({ showTable }: { showTable: boolean }) {
			return (
				<PageSubtitleProvider>
					<SubtitleProbe />
					{showTable ? renderNode(node) : null}
				</PageSubtitleProvider>
			);
		}

		const { findByTestId, rerender } = render(
			<Wrap>
				<Harness showTable={true} />
			</Wrap>,
		);
		await findByTestId("table-tabs");
		await waitFor(async () => {
			expect((await findByTestId("subtitle-probe")).textContent).toBe("Every post");
		});

		await act(async () => {
			rerender(
				<Wrap>
					<Harness showTable={false} />
				</Wrap>,
			);
		});

		await waitFor(async () => {
			expect((await findByTestId("subtitle-probe")).textContent).toBe("(none)");
		});
	});
});
