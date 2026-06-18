/**
 * MediaList tests — folder rows before file rows, file row content, and
 * navigate/select callbacks.
 */
import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaList } from "./mediaList";
import type { MediaFolder, MediaItem } from "./types";

const ITEM_IMG: MediaItem = {
	id: "img1",
	name: "photo.jpg",
	folderId: null,
	mime: "image/jpeg",
	size: 204800,
	url: "/storage/photo.jpg",
	sizes: { profile: "/storage/photo-thumb.jpg" },
	alt: "A photo",
	description: null,
	tags: ["hero", "banner"],
	createdAt: "2024-01-15T10:00:00Z",
};

const FOLDER: MediaFolder = { id: "c1", name: "Receipts", parentId: null };

describe("MediaList", () => {
	test("renders folder rows before file rows", () => {
		const { getByTestId } = render(
			<MediaList
				folders={[FOLDER]}
				items={[ITEM_IMG]}
				onSelect={() => {}}
				onSelectFolder={() => {}}
				onSort={() => {}}
			/>,
		);
		const list = getByTestId("media-list");
		const order = Array.from(list.querySelectorAll("[data-testid]"))
			.map((el) => el.getAttribute("data-testid"))
			.filter((id) => id === "media-list-folder-c1" || id === "media-list-row-img1");
		expect(order).toEqual(["media-list-folder-c1", "media-list-row-img1"]);
	});

	test("file row shows name, size, and tags", () => {
		const { getByTestId } = render(
			<MediaList
				folders={[]}
				items={[ITEM_IMG]}
				onSelect={() => {}}
				onSelectFolder={() => {}}
				onSort={() => {}}
			/>,
		);
		const row = getByTestId("media-list-row-img1");
		expect(row.textContent).toContain("photo.jpg");
		expect(row.textContent).toContain("200.0 KB");
		expect(row.textContent).toContain("hero");
		expect(row.textContent).toContain("banner");
	});

	test("clicking a folder row calls onSelectFolder with its id", async () => {
		const user = userEvent.setup({ delay: null });
		const navigated: string[] = [];
		const { getByTestId } = render(
			<MediaList
				folders={[FOLDER]}
				items={[]}
				onSelect={() => {}}
				onSelectFolder={(id) => navigated.push(id)}
				onSort={() => {}}
			/>,
		);
		await act(async () => {
			await user.click(getByTestId("media-list-folder-c1"));
		});
		expect(navigated).toEqual(["c1"]);
	});

	test("clicking a file row calls onSelect with the item", async () => {
		const user = userEvent.setup({ delay: null });
		const selected: MediaItem[] = [];
		const { getByTestId } = render(
			<MediaList
				folders={[]}
				items={[ITEM_IMG]}
				onSelect={(item) => selected.push(item)}
				onSelectFolder={() => {}}
				onSort={() => {}}
			/>,
		);
		await act(async () => {
			await user.click(getByTestId("media-list-row-img1"));
		});
		expect(selected).toHaveLength(1);
		expect(selected[0]?.id).toBe("img1");
	});

	test("selected file row reflects aria-selected", () => {
		const { getByTestId } = render(
			<MediaList
				folders={[]}
				items={[ITEM_IMG]}
				onSelect={() => {}}
				onSelectFolder={() => {}}
				onSort={() => {}}
				selectedIds={["img1"]}
			/>,
		);
		expect(getByTestId("media-list-row-img1").getAttribute("aria-selected")).toBe("true");
	});

	test("clicking a sortable header calls onSort with the server column", async () => {
		const user = userEvent.setup({ delay: null });
		const sorted: string[] = [];
		const { getByTestId } = render(
			<MediaList
				folders={[]}
				items={[ITEM_IMG]}
				onSelect={() => {}}
				onSelectFolder={() => {}}
				onSort={(c) => sorted.push(c)}
			/>,
		);
		await act(async () => {
			await user.click(getByTestId("media-list-sort-date"));
		});
		expect(sorted).toEqual(["created_at"]);
	});
});
