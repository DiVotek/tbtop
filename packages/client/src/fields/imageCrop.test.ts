import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { cropImage, isCroppable } from "./imageCrop";

const area = { x: 12, y: 24, width: 80, height: 40 };
const drawImage = mock(() => {});
let revoke: ReturnType<typeof spyOn>;
const OriginalImage = Image;

beforeEach(() => {
	drawImage.mockClear();
	spyOn(URL, "createObjectURL").mockReturnValue("blob:crop-test");
	revoke = spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	globalThis.Image = class extends OriginalImage {
		constructor() {
			super();
			queueMicrotask(() => this.dispatchEvent(new Event("load")));
		}
	};
	spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		drawImage,
	} as unknown as CanvasRenderingContext2D);
	spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
		callback(new Blob(["cropped pixels"], { type }));
	});
});

afterEach(() => {
	mock.restore();
	globalThis.Image = OriginalImage;
});

test("only supported raster MIME types are croppable", () => {
	for (const type of ["image/png", "image/jpeg", "image/webp"]) {
		expect(isCroppable(new File([], "file", { type }))).toBe(true);
	}
	for (const type of [
		"image/avif",
		"image/bmp",
		"image/svg+xml",
		"image/gif",
		"application/pdf",
		"text/plain",
		"",
	]) {
		expect(isCroppable(new File([], "looks-like.png", { type }))).toBe(false);
	}
});

test("crops source pixels into a new file with original name and MIME", async () => {
	const original = new File(["original"], "photo.jpg", { type: "image/jpeg" });
	const result = await cropImage(original, area);
	expect(result).not.toBe(original);
	expect(result.name).toBe("photo.jpg");
	expect(result.type).toBe("image/jpeg");
	expect(result.size).toBe(14);
	expect(drawImage).toHaveBeenCalledWith(expect.anything(), 12, 24, 80, 40, 0, 0, 80, 40);
	expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
		expect.any(Function),
		"image/jpeg",
		0.92,
	);
	expect(revoke).toHaveBeenCalledWith("blob:crop-test");
});

test("rejects unavailable canvas and releases source URL", async () => {
	spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
	await expect(cropImage(new File([], "a.png", { type: "image/png" }), area)).rejects.toThrow(
		"Canvas is unavailable",
	);
	expect(revoke).toHaveBeenCalled();
});

test("rejects empty encoder output and MIME fallback instead of mislabelling pixels", async () => {
	const file = new File([], "a.bmp", { type: "image/bmp" });
	spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(null));
	await expect(cropImage(file, area)).rejects.toThrow("Image encoding failed");
	spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
		callback(new Blob([], { type: "image/png" })),
	);
	await expect(cropImage(file, area)).rejects.toThrow("Image encoding failed");
});
