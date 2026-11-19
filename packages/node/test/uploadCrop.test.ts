import { expect, test } from "bun:test";
import { Upload } from "../src";

test("crop serializes a positive width/height ratio alongside image conversion", () => {
	expect(new Upload("photo").convertTo("webp").quality(80).crop(1.5).toJSON()).toMatchObject({
		options: { image: { convertTo: "webp", quality: 80, crop: { aspectRatio: 1.5 } } },
	});
});

test("free crop serializes as an empty object and cropping remains opt-in", () => {
	for (const field of [new Upload("photo").crop(), new Upload("photo").crop(null)]) {
		expect(JSON.stringify(field)).toContain('"crop":{}');
	}
	expect(JSON.stringify(new Upload("photo"))).not.toContain('"crop"');
});

test.each([
	0,
	-1.5,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	Number.NaN,
])("crop rejects invalid aspect ratio %p", (aspectRatio) => {
	expect(() => new Upload("photo").crop(aspectRatio)).toThrow(RangeError);
});
