import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { filenameFrom } from "../../data/download";
import { materialize } from "../../inertia/materialize";
import { renderNode } from "../../render/structureRenderer";
import { wrapForStructure as wrap } from "../testFixtures";
import type { StructureNode } from "../types";

const exportAction: StructureNode = {
	kind: "action",
	name: "export",
	options: {
		label: "Export",
		spec: {
			type: "custom",
			handler: "tbtop.export",
			params: { formats: ["csv", "xlsx"], maxRows: 50000, filename: "posts" },
		},
	},
	meta: {},
};

function tableNode(): StructureNode {
	return {
		kind: "table",
		name: "posts",
		options: {
			columns: [
				{ name: "title", label: "Title" },
				{ name: "note", label: "Note", export: { label: "Notes", on: false } },
				{ name: "secret", label: "Secret", toggleable: true, hiddenByDefault: true },
				{
					name: "car",
					label: "Car",
					kind: "group",
					columns: [{ name: "car_name", label: "Name" }, { name: "car_plate" }],
				},
			],
			searchable: ["title"],
			headerActions: [exportAction],
			bulkActions: [{ ...exportAction, name: "exportPicked" }],
		},
		meta: {},
	};
}

let requests: string[] = [];
let saved: string[] = [];
const realClick = HTMLAnchorElement.prototype.click;
let downloadResponse: () => Response = () => new Response("a,b");

function handler(req: Request): Response {
	requests.push(req.url);
	if (req.url.includes("/export/")) {
		return downloadResponse();
	}
	return new Response(
		JSON.stringify({
			data: {
				data: [
					{ _key: "1", id: 1, title: "A" },
					{ _key: "2", id: 2, title: "B" },
				],
				total: 2,
				page: 1,
				perPage: 25,
			},
		}),
	);
}

async function openExport() {
	const node = materialize(tableNode(), { basePath: "/admin/posts", data: {} });
	const Wrap = wrap(handler);
	const view = render(<Wrap>{renderNode(node)}</Wrap>);
	await view.findByText("A");
	fireEvent.click(view.getByTestId("action-export"));
	await view.findByTestId("table-export");
	return view;
}

function exportUrl(): URL {
	const url = requests.find((u) => u.includes("/export/"));
	if (!url) {
		throw new Error("no export request");
	}
	return new URL(url);
}

beforeEach(() => {
	requests = [];
	saved = [];
	// A real click would navigate happy-dom's window to the blob URL for every later test file.
	HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
		saved.push(this.download);
	};
	downloadResponse = () =>
		new Response("a,b", {
			headers: { "Content-Disposition": "attachment; filename=posts.csv" },
		});
	localStorage.clear();
});

afterEach(() => {
	HTMLAnchorElement.prototype.click = realClick;
	localStorage.clear();
});

describe("table export dialog", () => {
	test("lists value columns, ticking visible ones except export(enabled: false)", async () => {
		const view = await openExport();
		const ticked = (name: string) =>
			view.getByTestId(`table-export-column-${name}`).getAttribute("data-state");

		expect(view.getByText("Notes")).toBeTruthy();
		expect(ticked("title")).toBe("checked");
		expect(ticked("note")).toBe("unchecked");
		expect(ticked("secret")).toBe("unchecked");
		expect(ticked("car_name")).toBe("checked");
		expect(ticked("car_plate")).toBe("checked");
		expect(view.queryByTestId("table-export-column-car")).toBeNull();
	});

	test("downloads with the table state, the picked columns and format", async () => {
		const view = await openExport();
		fireEvent.change(view.getByTestId("table-search-input"), { target: { value: "x" } });
		fireEvent.click(view.getByTestId("table-export-column-car_plate"));
		fireEvent.click(view.getByTestId("table-export-format-xlsx"));
		await act(async () => {
			fireEvent.click(view.getByTestId("table-export-download"));
		});

		await waitFor(() => expect(requests.some((u) => u.includes("/export/"))).toBe(true));
		const url = exportUrl();
		expect(url.pathname).toBe("/admin/posts/tables/posts/export/export");
		expect(url.searchParams.get("format")).toBe("xlsx");
		expect(url.searchParams.getAll("columns[]")).toEqual(["title", "car_name"]);
		expect(url.searchParams.has("page")).toBe(false);
		expect(url.searchParams.has("ids[]")).toBe(false);
		await waitFor(() => expect(saved).toEqual(["posts.csv"]));
	});

	test("with a selection, exports the selected ids unless all matching rows are chosen", async () => {
		const node = materialize(tableNode(), { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(handler);
		const view = render(<Wrap>{renderNode(node)}</Wrap>);
		await view.findByText("A");
		fireEvent.click(view.getByTestId("table-select-2"));
		fireEvent.click(await view.findByTestId("action-exportPicked"));
		await view.findByTestId("table-export");

		expect(view.getByText("Selected rows (1)")).toBeTruthy();
		expect(view.getByText("All matching rows (2)")).toBeTruthy();
		await act(async () => {
			fireEvent.click(view.getByTestId("table-export-download"));
		});
		await waitFor(() => expect(requests.some((u) => u.includes("/export/"))).toBe(true));
		expect(exportUrl().pathname).toBe("/admin/posts/tables/posts/export/exportPicked");
		expect(exportUrl().searchParams.getAll("ids[]")).toEqual(["2"]);
	});

	test("remembers the pick for the next open", async () => {
		const first = await openExport();
		fireEvent.click(first.getByTestId("table-export-column-note"));
		fireEvent.click(first.getByTestId("table-export-format-xlsx"));
		first.unmount();

		const view = await openExport();
		expect(view.getByTestId("table-export-column-note").getAttribute("data-state")).toBe(
			"checked",
		);
		expect(view.getByTestId("table-export-format-xlsx").getAttribute("data-state")).toBe(
			"checked",
		);
	});

	test("the server's refusal shows in the open dialog", async () => {
		downloadResponse = () =>
			new Response(JSON.stringify({ message: "This export has 9 rows, over the 2 limit." }), {
				status: 422,
			});
		const view = await openExport();
		await act(async () => {
			fireEvent.click(view.getByTestId("table-export-download"));
		});

		expect((await view.findByTestId("modal-halt-message")).textContent).toContain("9 rows");
		expect(view.getByTestId("table-export")).toBeTruthy();
	});

	test("select all ticks every column, a second click clears them and disables the download", async () => {
		const view = await openExport();
		fireEvent.click(view.getByTestId("table-export-all"));
		expect(view.getByTestId("table-export-column-secret").getAttribute("data-state")).toBe(
			"checked",
		);
		fireEvent.click(view.getByTestId("table-export-all"));
		expect(view.getByTestId("table-export-download").hasAttribute("disabled")).toBe(true);
	});
});

describe("filenameFrom", () => {
	test("prefers the UTF-8 name over the ASCII fallback", () => {
		expect(
			filenameFrom(
				`attachment; filename=posts_.csv; filename*=UTF-8''%D0%BF%D0%BE%D1%81%D1%82.csv`,
			),
		).toBe("пост.csv");
		expect(filenameFrom('attachment; filename="posts.csv"')).toBe("posts.csv");
		expect(filenameFrom(null)).toBeUndefined();
	});
});
