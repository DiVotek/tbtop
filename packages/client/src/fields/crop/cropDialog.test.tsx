import { describe, expect, test } from "bun:test";
import { initialCrop, toPixelArea } from "./cropDialog";

describe("crop geometry", () => {
	test("a free crop starts at 90% centred", () => {
		expect(initialCrop(undefined, 800, 600)).toEqual({
			unit: "%",
			x: 5,
			y: 5,
			width: 90,
			height: 90,
		});
	});

	test("an aspect crop starts centred at that aspect", () => {
		const crop = initialCrop(1, 800, 400);
		// 90% of the width would overflow a square on a 2:1 image, so it is clamped by height.
		const px = toPixelArea(crop, 800, 400);
		expect(Math.round(px.width)).toBe(Math.round(px.height));
		expect(Math.round(px.x + px.width / 2)).toBe(400);
		expect(Math.round(px.y + px.height / 2)).toBe(200);
	});

	test("percent selection maps onto the natural image size", () => {
		const area = toPixelArea({ unit: "%", x: 10, y: 20, width: 50, height: 25 }, 2000, 1000);
		expect(area).toEqual({ x: 200, y: 200, width: 1000, height: 250 });
	});
});
