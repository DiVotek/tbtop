/**
 * mediaPickerField tests.
 *
 * Contract mocked:
 *   GET /media/:id  → MediaItem
 *   GET /media?...  → MediaListResponse
 *   GET /media/folders → MediaFolder[]
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ClientProvider, createAdminClient } from "../data/client";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import type { FetchHandler } from "../testFixtures";
import { makeTestFetch } from "../testFixtures";
import { MediaPickerForm } from "./mediaPickerField";
import type { MediaItem } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ITEM_IMG: MediaItem = {
	id: "img1",
	name: "photo.jpg",
	folderId: null,
	mime: "image/jpeg",
	size: 204800,
	url: "/storage/photo.jpg",
	sizes: { profile: "/storage/photo-thumb.jpg" },
	alt: "A photo",
	createdAt: "2024-01-15T10:00:00Z",
};

const ITEM_PDF: MediaItem = {
	id: "pdf1",
	name: "document.pdf",
	folderId: null,
	mime: "application/pdf",
	size: 102400,
	url: "/storage/document.pdf",
	sizes: {},
	alt: null,
	createdAt: "2024-01-16T10:00:00Z",
};

function mediaListResponse(items: MediaItem[]) {
	return new Response(
		JSON.stringify({ data: items, total: items.length, page: 1, perPage: 24 }),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}

function wrap(handler: FetchHandler) {
	const client = createAdminClient({ baseUrl: "http://test", fetch: makeTestFetch(handler) });
	return function Wrapper({ children }: { children: ReactNode }) {
		return <ClientProvider client={client}>{children}</ClientProvider>;
	};
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

// ─── Form: preview resolves from value ────────────────────────────────────────

describe("MediaPickerForm: preview from initial value", () => {
	test("renders image thumbnail when id resolves to an image item", async () => {
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/img1")) {
				return new Response(JSON.stringify(ITEM_IMG), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { findByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value="img1"
					onChange={() => {}}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		// After the fetch resolves, the preview chip should appear
		await findByTestId("media-preview-img1");
	});

	test("renders no preview when value is null", () => {
		const Wrap = wrap(() => new Response("[]"));
		const { queryByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value={null}
					onChange={() => {}}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		expect(queryByTestId("media-preview-img1")).toBeNull();
	});
});

// ─── Form: choose button opens picker ─────────────────────────────────────────

describe("MediaPickerForm: picker modal opens", () => {
	test("clicking Choose opens the picker modal", async () => {
		const user = userEvent.setup({ delay: null });
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) return new Response("[]");
			return mediaListResponse([]);
		};
		const Wrap = wrap(handler);
		const { getByTestId, findByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value={null}
					onChange={() => {}}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		await act(async () => {
			await user.click(getByTestId("media-picker-choose-cover"));
		});
		await findByTestId("media-picker-modal");
	});
});

// ─── Form: single select closes picker and fires onChange ─────────────────────

describe("MediaPickerForm: single select", () => {
	test("clicking a card in single mode fires onChange and closes modal", async () => {
		const user = userEvent.setup({ delay: null });
		const changes: Array<unknown> = [];
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) return new Response("[]");
			return mediaListResponse([ITEM_IMG]);
		};
		const Wrap = wrap(handler);
		const { getByTestId, findByTestId, queryByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value={null}
					onChange={(v) => changes.push(v)}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		// Open picker
		await act(async () => {
			await user.click(getByTestId("media-picker-choose-cover"));
		});
		await findByTestId("media-picker-modal");

		// Wait for grid to load and click the card
		const card = await findByTestId("media-card-img1");
		await act(async () => {
			await user.click(card);
		});

		await waitFor(() => expect(changes).toHaveLength(1));
		expect(changes[0]).toBe("img1");

		// Modal should close
		await waitFor(() => expect(queryByTestId("media-picker-modal")).toBeNull());
	});
});

// ─── Form: multiple select with confirm ───────────────────────────────────────

describe("MediaPickerForm: multiple select", () => {
	test("selecting two items and clicking Confirm fires onChange with array", async () => {
		const user = userEvent.setup({ delay: null });
		const changes: Array<unknown> = [];
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) return new Response("[]");
			return mediaListResponse([ITEM_IMG, ITEM_PDF]);
		};
		const Wrap = wrap(handler);
		const { getByTestId, findByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="gallery"
					value={null}
					onChange={(v) => changes.push(v)}
					options={{ multiple: true }}
				/>
			</Wrap>,
		);
		// Open picker
		await act(async () => {
			await user.click(getByTestId("media-picker-choose-gallery"));
		});
		await findByTestId("media-picker-modal");

		// Select both cards
		const cardImg = await findByTestId("media-card-img1");
		const cardPdf = await findByTestId("media-card-pdf1");
		await act(async () => {
			await user.click(cardImg);
			await user.click(cardPdf);
		});

		// Confirm
		await act(async () => {
			await user.click(getByTestId("media-picker-confirm"));
		});

		await waitFor(() => expect(changes).toHaveLength(1));
		const result = changes[0] as string[];
		expect(result).toContain("img1");
		expect(result).toContain("pdf1");
	});
});

// ─── Form: clear button removes single value ──────────────────────────────────

describe("MediaPickerForm: clear single value", () => {
	test("clear button fires onChange(null)", async () => {
		const user = userEvent.setup({ delay: null });
		const changes: Array<unknown> = [];
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/img1")) {
				return new Response(JSON.stringify(ITEM_IMG), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { findByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value="img1"
					onChange={(v) => changes.push(v)}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		// Wait for preview to render
		await findByTestId("media-preview-img1");
		const clearBtn = await findByTestId("media-picker-clear-cover");
		await act(async () => {
			await user.click(clearBtn);
		});
		await waitFor(() => expect(changes).toHaveLength(1));
		expect(changes[0]).toBeNull();
	});
});
