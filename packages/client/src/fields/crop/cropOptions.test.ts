import { describe, expect, test } from "bun:test";
import { renameFor } from "./cropImage";
import { isCroppable, parseAspects } from "./cropOptions";

describe("parseAspects", () => {
	test("turns W:H into a ratio and free into no ratio, keeping order", () => {
		expect(parseAspects(["16:9", "free", "1:1"])).toEqual([
			{ label: "16:9", ratio: 16 / 9 },
			{ label: "free", ratio: undefined },
			{ label: "1:1", ratio: 1 },
		]);
	});

	test("drops malformed entries and falls back to free when nothing is left", () => {
		expect(parseAspects(["0:1", "wide", "4:x"])).toEqual([{ label: "free", ratio: undefined }]);
	});
});

describe("isCroppable", () => {
	test("JPEG, PNG and WebP are cropped; SVG, GIF, HEIC, AVIF and non-images pass through", () => {
		const file = (type: string) => new File(["x"], "f", { type });
		expect(isCroppable(file("image/jpeg"))).toBe(true);
		expect(isCroppable(file("image/webp"))).toBe(true);
		expect(isCroppable(file("image/svg+xml"))).toBe(false);
		expect(isCroppable(file("image/gif"))).toBe(false);
		expect(isCroppable(file("image/heic"))).toBe(false);
		expect(isCroppable(file("image/avif"))).toBe(false);
		expect(isCroppable(file("application/pdf"))).toBe(false);
	});
});

describe("renameFor", () => {
	test("keeps the name unless the image was re-encoded as PNG", () => {
		expect(renameFor("photo.jpg", "image/jpeg")).toBe("photo.jpg");
		expect(renameFor("photo.heic", "image/png")).toBe("photo.png");
		expect(renameFor("logo.PNG", "image/png")).toBe("logo.PNG");
	});
});
