import { describe, expect, test } from "bun:test";
import { readId } from "./normalize";

describe("readId", () => {
	test("reads the record key from _key, not a formatted id column", () => {
		expect(readId({ _key: 42, id: "#42" })).toBe("42");
	});

	test("falls back to id for a row without _key", () => {
		expect(readId({ id: "a1" })).toBe("a1");
	});
});
