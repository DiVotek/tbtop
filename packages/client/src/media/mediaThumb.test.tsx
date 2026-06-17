import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { MediaThumb } from "./mediaThumb";
import type { MediaItem } from "./types";

const IMAGE: MediaItem = {
	id: "img1",
	name: "photo.jpg",
	folderId: null,
	mime: "image/jpeg",
	size: 1024,
	url: "/storage/photo.jpg",
	sizes: { profile: "/storage/photo-thumb.jpg" },
	alt: "A photo",
	description: null,
	tags: [],
	createdAt: "2024-01-15T10:00:00Z",
};

const PDF: MediaItem = {
	id: "pdf1",
	name: "report.pdf",
	folderId: null,
	mime: "application/pdf",
	size: 2048,
	url: "/storage/report.pdf",
	sizes: {},
	alt: null,
	description: null,
	tags: [],
	createdAt: "2024-01-16T10:00:00Z",
};

describe("MediaThumb", () => {
	test("renders an <img> for an image item using the profile size", () => {
		const { container } = render(<MediaThumb item={IMAGE} imgTestId="thumb" />);
		const img = container.querySelector("img");
		expect(img).not.toBeNull();
		expect(img?.getAttribute("src")).toBe("/storage/photo-thumb.jpg");
		expect(img?.getAttribute("data-testid")).toBe("thumb");
	});

	test("renders a typed icon and the extension badge for a non-image item", () => {
		const { container, getByText } = render(<MediaThumb item={PDF} iconTestId="icon" />);
		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("svg")).not.toBeNull();
		expect(getByText("PDF")).toBeTruthy();
	});
});
