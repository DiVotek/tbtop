import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { RowProvider } from "./rowContext";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

// A modal whose body is a form + a save action that captures the form data.
// The save handler reads c.form.data, which is the deterministic way to assert
// the form prefilled (getByDisplayValue is flaky on CI — see formBlock.test).
function modalWithQuery(query: () => Promise<unknown>, capture: (data: unknown) => void) {
	return s.action({
		name: "edit",
		label: "Edit",
		modal: {
			title: "Edit",
			query,
			body: (sb) =>
				sb.form({}, [
					sb.text({ name: "title" }),
					sb.action({
						name: "save",
						label: "Save",
						handler: async (c) => capture(c.form?.data),
					}),
				]),
		},
	});
}

describe("Modal backend data query", () => {
	test("modal with a query prefills the body form from the fetched data", async () => {
		let seen: unknown = null;
		const node = modalWithQuery(
			async () => ({ title: "Fetched title" }),
			(d) => {
				seen = d;
			},
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await act(async () => {
			fireEvent.click(await findByTestId("action-edit"));
		});
		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		expect(seen).toEqual({ title: "Fetched title" });
	});

	test("opening the modal calls the query with the row context", async () => {
		const seenRows: unknown[] = [];
		const node = s.action({
			name: "edit",
			label: "Edit",
			modal: {
				title: "Edit",
				query: async (c) => {
					seenRows.push(c.row);
					return { title: "x" };
				},
				body: (sb) => sb.form({}, [sb.text({ name: "title" })]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(
			<Wrap>
				<RowProvider value={{ id: "7", title: "Row 7" }}>{renderNode(node)}</RowProvider>
			</Wrap>,
		);
		await act(async () => {
			fireEvent.click(await findByTestId("action-edit"));
		});
		expect(seenRows[0]).toEqual({ id: "7", title: "Row 7" });
	});

	test("modal with no query renders the body unchanged (static record)", async () => {
		let seen: unknown = null;
		const node = s.action({
			name: "edit",
			label: "Edit",
			modal: {
				title: "Edit",
				body: (sb) =>
					sb.form({ query: async () => ({ title: "Static" }) }, [
						sb.text({ name: "title" }),
						sb.action({
							name: "save",
							label: "Save",
							handler: async (c) => {
								seen = c.form?.data;
							},
						}),
					]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await act(async () => {
			fireEvent.click(await findByTestId("action-edit"));
		});
		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		expect(seen).toEqual({ title: "Static" });
	});
});
