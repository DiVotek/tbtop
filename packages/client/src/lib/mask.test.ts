import { expect, test } from "bun:test";
import { applyMask } from "./mask";

test("empty input stays empty", () => {
	expect(applyMask("", "(999) 999-9999")).toBe("");
});

test("empty pattern returns the input untouched", () => {
	expect(applyMask("abc", "")).toBe("abc");
});

test("inserts literals eagerly once a slot is filled", () => {
	expect(applyMask("12", "99/99/9999")).toBe("12/");
});

test("formats a full date", () => {
	expect(applyMask("12312024", "99/99/9999")).toBe("12/31/2024");
});

test("formats a full phone number", () => {
	expect(applyMask("1234567890", "(999) 999-9999")).toBe("(123) 456-7890");
});

test("groups a card number into blocks of four", () => {
	expect(applyMask("4111111111111111", "9999 9999 9999 9999")).toBe("4111 1111 1111 1111");
});

test("skips characters that do not fit the slot type", () => {
	expect(applyMask("ab12cd", "99")).toBe("12");
});

test("letter slots reject digits", () => {
	expect(applyMask("a1", "aa")).toBe("a");
});

test("alphanumeric slots accept both", () => {
	expect(applyMask("a1b2", "****")).toBe("a1b2");
});

test("re-masking an already-masked value is stable", () => {
	expect(applyMask("12/31/2024", "99/99/9999")).toBe("12/31/2024");
});
