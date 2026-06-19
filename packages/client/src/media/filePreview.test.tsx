/**
 * FilePreview tests.
 *
 * Rules under test:
 *   - default renderer exposes Open + Download anchors with correct hrefs
 *   - default renderer renders the inline <img> for image items (via MediaThumb)
 *   - a registered preview whose predicate matches WINS over the default
 */
import { afterEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { ClientProvider, createAdminClient } from "../data/client";
import { clearFilePreviewRegistry, FilePreview, registerFilePreview } from "./filePreview";
import type { MediaItem } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ITEM_PDF: MediaItem = {
	id: "42",
	name: "report.pdf",
	folderId: null,
	mime: "application/pdf",
	size: 102400,
	url: "/storage/report.pdf",
	sizes: {},
	alt: null,
	description: null,
	tags: [],
	createdAt: "2024-01-16T10:00:00Z",
};

const ITEM_IMG: MediaItem = {
	id: "7",
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

function wrap(apiBase: string) {
	const client = createAdminClient({ baseUrl: "http://test" });
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClientProvider client={client} apiBase={apiBase}>
				{children}
			</ClientProvider>
		);
	};
}

afterEach(() => {
	clearFilePreviewRegistry();
});

// ─── Default: Open + Download anchors ─────────────────────────────────────────

describe("FilePreview default renderer", () => {
	test("shows Open and Download anchors with correct hrefs for a PDF", () => {
		const Wrap = wrap("/admin/api");
		const { getByTestId } = render(
			<Wrap>
				<FilePreview item={ITEM_PDF} />
			</Wrap>,
		);

		const open = getByTestId("file-preview-open") as HTMLAnchorElement;
		const download = getByTestId("file-preview-download") as HTMLAnchorElement;

		expect(open.getAttribute("href")).toBe("/storage/report.pdf");
		expect(open.getAttribute("target")).toBe("_blank");
		expect(download.getAttribute("href")).toBe("/admin/api/media/42/download");
		expect(download.hasAttribute("download")).toBe(true);
	});

	test("renders the inline <img> for an image item", () => {
		const Wrap = wrap("/admin/api");
		const { getByTestId } = render(
			<Wrap>
				<FilePreview item={ITEM_IMG} />
			</Wrap>,
		);

		const img = getByTestId("detail-preview-img") as HTMLImageElement;
		expect(img.tagName).toBe("IMG");
	});
});

// ─── Registry override wins over default ──────────────────────────────────────

describe("FilePreview registry override", () => {
	test("a matching registered renderer wins over the default", () => {
		registerFilePreview(
			(item) => item.mime === "application/pdf",
			() => <div data-testid="custom-pdf-preview">custom</div>,
		);

		const Wrap = wrap("/admin/api");
		const { getByTestId, queryByTestId } = render(
			<Wrap>
				<FilePreview item={ITEM_PDF} />
			</Wrap>,
		);

		expect(getByTestId("custom-pdf-preview").textContent).toBe("custom");
		// Default controls must NOT render when an override matches.
		expect(queryByTestId("file-preview-open")).toBeNull();
		expect(queryByTestId("file-preview-download")).toBeNull();
	});

	test("non-matching registration falls through to the default", () => {
		registerFilePreview(
			(item) => item.mime === "text/markdown",
			() => <div data-testid="custom-md-preview">md</div>,
		);

		const Wrap = wrap("/admin/api");
		const { getByTestId, queryByTestId } = render(
			<Wrap>
				<FilePreview item={ITEM_PDF} />
			</Wrap>,
		);

		expect(queryByTestId("custom-md-preview")).toBeNull();
		expect(getByTestId("file-preview-download")).not.toBeNull();
	});
});
