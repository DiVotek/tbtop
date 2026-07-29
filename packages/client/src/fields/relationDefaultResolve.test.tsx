import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { makeField, s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";

interface AuthorRow {
	value: string;
	label: string;
}

function isAuthorRow(row: unknown): row is AuthorRow {
	return (
		typeof row === "object" &&
		row !== null &&
		"value" in row &&
		"label" in row &&
		typeof row.value === "string" &&
		typeof row.label === "string"
	);
}

/**
 * A server-seeded ->default() reaches the field as ordinary form data, so an
 * async relation must resolve its label on mount with no extra trigger. Guards
 * the assumption behind applying defaults server-side: if the value ever lands
 * after first render, onLoad never fires and the field renders blank.
 */
describe("relation resolves a seeded default", () => {
	test("renders the resolved label, not the raw id", async () => {
		const row: AuthorRow = { value: "7", label: "Alice Smith" };
		const onLoad = mock(async () => row);
		const relation = makeField("relation");
		const node = s.form({ query: async () => ({ author_id: "7" }) }, [
			relation({
				name: "author_id",
				query: async () => [row],
				onLoad,
				optionLabel: (r: unknown) => (isAuthorRow(r) ? r.label : ""),
				optionValue: (r: unknown) => (isAuthorRow(r) ? r.value : ""),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));

		const { container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await waitFor(() => expect(container.textContent).toContain("Alice Smith"));
		expect(onLoad).toHaveBeenCalledWith(expect.anything(), "7");
	});
});
