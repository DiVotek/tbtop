import { expect, test } from "bun:test";
import { freeCropSize } from "./imageCropSizing";

test("free crop retains the whole landscape image at 100%", () => {
	expect(freeCropSize({ width: 512, height: 288 }, { width: 100, height: 100 })).toEqual({
		width: 512,
		height: 288,
	});
	expect(freeCropSize({ width: 512, height: 288 }, { width: 100, height: 50 })).toEqual({
		width: 512,
		height: 144,
	});
});

test("free crop retains the whole portrait image and full-height strips", () => {
	expect(freeCropSize({ width: 288, height: 512 }, { width: 100, height: 100 })).toEqual({
		width: 288,
		height: 512,
	});
	expect(freeCropSize({ width: 288, height: 512 }, { width: 50, height: 100 })).toEqual({
		width: 144,
		height: 512,
	});
});

test("free crop scales against resized rendered media", () => {
	expect(freeCropSize({ width: 256, height: 144 }, { width: 50, height: 50 })).toEqual({
		width: 128,
		height: 72,
	});
});

test("free crop waits for positive rendered media dimensions", () => {
	expect(freeCropSize(undefined, { width: 100, height: 100 })).toBeUndefined();
	expect(freeCropSize({ width: 0, height: 0 }, { width: 100, height: 100 })).toBeUndefined();
});
