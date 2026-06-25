import { afterEach, expect, test } from "bun:test";
import { copyToClipboard } from "./clipboard";

const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

afterEach(() => {
	if (original) {
		Object.defineProperty(globalThis.navigator, "clipboard", original);
	}
});

function stubClipboard(value: unknown): void {
	Object.defineProperty(globalThis.navigator, "clipboard", { value, configurable: true });
}

test("uses navigator.clipboard when available", async () => {
	let captured = "";
	stubClipboard({
		writeText: async (text: string) => {
			captured = text;
		},
	});
	expect(await copyToClipboard("hello")).toBe(true);
	expect(captured).toBe("hello");
});

test("falls back to execCommand in non-secure contexts", async () => {
	stubClipboard(undefined);
	let copied = false;
	const realExec = document.execCommand;
	document.execCommand = ((cmd: string) => {
		copied = cmd === "copy";
		return copied;
	}) as typeof document.execCommand;
	try {
		expect(await copyToClipboard("legacy")).toBe(true);
		expect(copied).toBe(true);
	} finally {
		document.execCommand = realExec;
	}
});
