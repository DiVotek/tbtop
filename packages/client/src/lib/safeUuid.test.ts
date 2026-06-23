import { afterEach, expect, test } from "bun:test";
import { safeUuid } from "./safeUuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = globalThis.crypto;

afterEach(() => {
	Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
});

function stubCrypto(value: unknown): void {
	Object.defineProperty(globalThis, "crypto", { value, configurable: true });
}

test("uses crypto.randomUUID when available", () => {
	stubCrypto({ randomUUID: () => "11111111-1111-4111-8111-111111111111" });
	expect(safeUuid()).toBe("11111111-1111-4111-8111-111111111111");
});

test("falls back to a valid uuid v4 in insecure contexts (no randomUUID)", () => {
	// The reported bug: plain HTTP on a LAN IP — randomUUID is undefined.
	stubCrypto({ getRandomValues: (b: Uint8Array) => b.fill(0xab) });
	expect(safeUuid()).toMatch(UUID_V4);
});

test("falls back to Math.random when crypto is entirely absent", () => {
	stubCrypto(undefined);
	const id = safeUuid();
	expect(id).toMatch(UUID_V4);
	expect(id).not.toBe(safeUuid());
});
