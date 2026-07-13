/**
 * mediaPickerField tests.
 *
 * Contract mocked:
 *   GET /media/:id  → MediaItem
 *   GET /media?...  → MediaListResponse
 *   GET /media/folders → MediaFolder[]
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
	description: null,
	tags: [],
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
	description: null,
	tags: [],
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

// ─── Form: inline (default) — Choose button + filename display ────────────────

describe("MediaPickerForm: inline filename display", () => {
	test("display field shows the resolved file name (variant omitted = inline)", async () => {
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/img1")) {
				return new Response(JSON.stringify(ITEM_IMG), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { getByTestId, queryByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value="img1"
					onChange={() => {}}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		const input = getByTestId("media-picker-name-cover") as HTMLInputElement;
		await waitFor(() => expect(input.value).toBe(ITEM_IMG.name));
		// Inline is the default: no clickable preview block.
		expect(queryByTestId("media-picker-preview-cover")).toBeNull();
	});

	test("display field is empty when value is null", () => {
		const Wrap = wrap(() => new Response("[]"));
		const { getByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value={null}
					onChange={() => {}}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		const input = getByTestId("media-picker-name-cover") as HTMLInputElement;
		expect(input.value).toBe("");
	});
});

// ─── Form: variant="preview" — clickable preview block ────────────────────────

describe("MediaPickerForm: variant preview", () => {
	test("empty placeholder block is clickable and opens the picker", async () => {
		const user = userEvent.setup({ delay: null });
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) {
				return new Response("[]");
			}
			return mediaListResponse([]);
		};
		const Wrap = wrap(handler);
		const { getByTestId, findByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value={null}
					onChange={() => {}}
					options={{ multiple: false, variant: "preview" }}
				/>
			</Wrap>,
		);
		await act(async () => {
			await user.click(getByTestId("media-picker-preview-cover"));
		});
		await findByTestId("media-picker-modal");
	});

	test("renders the selected image inside the still-clickable block", async () => {
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/img1")) {
				return new Response(JSON.stringify(ITEM_IMG), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { findByTestId, getByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value="img1"
					onChange={() => {}}
					options={{ multiple: false, variant: "preview" }}
				/>
			</Wrap>,
		);
		const img = await findByTestId("media-preview-img-img1");
		expect(img.getAttribute("src")).toBe(ITEM_IMG.sizes.profile ?? ITEM_IMG.url);
		// The block stays clickable for re-selection.
		expect(getByTestId("media-picker-preview-cover").tagName).toBe("BUTTON");
	});

	test("corner clear button fires onChange(null)", async () => {
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
					options={{ multiple: false, variant: "preview" }}
				/>
			</Wrap>,
		);
		await findByTestId("media-preview-img-img1");
		const clearBtn = await findByTestId("media-picker-clear-cover");
		await act(async () => {
			await user.click(clearBtn);
		});
		await waitFor(() => expect(changes).toHaveLength(1));
		expect(changes[0]).toBeNull();
	});

	test("renders a typed file card for non-image items", async () => {
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/pdf1")) {
				return new Response(JSON.stringify(ITEM_PDF), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { findByTestId, queryByTestId, getByText } = render(
			<Wrap>
				<MediaPickerForm
					name="doc"
					value="pdf1"
					onChange={() => {}}
					options={{ multiple: false, variant: "preview" }}
				/>
			</Wrap>,
		);
		await findByTestId("media-preview-icon-pdf1");
		expect(queryByTestId("media-preview-img-pdf1")).toBeNull();
		getByText(ITEM_PDF.name);
	});

	test("multiple mode keeps preview chips regardless of variant", async () => {
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/img1")) {
				return new Response(JSON.stringify(ITEM_IMG), { status: 200 });
			}
			return new Response("[]");
		};
		const Wrap = wrap(handler);
		const { findByTestId, queryByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="gallery"
					value={["img1"]}
					onChange={() => {}}
					options={{ multiple: true, variant: "preview" }}
				/>
			</Wrap>,
		);
		await findByTestId("media-preview-img1");
		expect(queryByTestId("media-picker-preview-gallery")).toBeNull();
	});
});

// ─── Form: choose button opens picker ─────────────────────────────────────────

describe("MediaPickerForm: picker modal opens", () => {
	test("clicking Choose opens the picker modal", async () => {
		const user = userEvent.setup({ delay: null });
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) {
				return new Response("[]");
			}
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
			if (req.url.includes("/media/folders")) {
				return new Response("[]");
			}
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

		// The inline display field shows the selected file name
		const input = getByTestId("media-picker-name-cover") as HTMLInputElement;
		expect(input.value).toBe(ITEM_IMG.name);
	});
});

// ─── Form: multiple select with confirm ───────────────────────────────────────

describe("MediaPickerForm: multiple select", () => {
	test("selecting two items and clicking Confirm fires onChange with array", async () => {
		const user = userEvent.setup({ delay: null });
		const changes: Array<unknown> = [];
		const handler: FetchHandler = (req) => {
			if (req.url.includes("/media/folders")) {
				return new Response("[]");
			}
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
		const { findByTestId, getByTestId } = render(
			<Wrap>
				<MediaPickerForm
					name="cover"
					value="img1"
					onChange={(v) => changes.push(v)}
					options={{ multiple: false }}
				/>
			</Wrap>,
		);
		// Wait for the display field to resolve the file name
		const input = getByTestId("media-picker-name-cover") as HTMLInputElement;
		await waitFor(() => expect(input.value).toBe(ITEM_IMG.name));
		const clearBtn = await findByTestId("media-picker-clear-cover");
		await act(async () => {
			await user.click(clearBtn);
		});
		await waitFor(() => expect(changes).toHaveLength(1));
		expect(changes[0]).toBeNull();
	});
});
