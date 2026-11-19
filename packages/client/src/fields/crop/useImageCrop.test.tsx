import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useImageCrop } from "./useImageCrop";

const options = { aspects: ["1:1"] };
const jpeg = () => new File(["x"], "a.jpg", { type: "image/jpeg" });

describe("useImageCrop", () => {
	test("without crop options every file passes straight through", async () => {
		const { result } = renderHook(() => useImageCrop(undefined));
		const file = jpeg();
		expect(await result.current.cropFile(file)).toBe(file);
	});

	test("an open crop settles as cancelled when the field unmounts", async () => {
		const { result, unmount } = renderHook(() => useImageCrop(options));
		let pending: Promise<File | null> = Promise.resolve(null);
		act(() => {
			pending = result.current.cropFile(jpeg());
		});
		unmount();
		expect(await pending).toBeNull();
	});
});
