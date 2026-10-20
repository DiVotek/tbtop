import { describe, expect, test } from "bun:test";
import { matchesKeybinding, parseKeybinding } from "./keybinding";

function unreachable(): never {
	throw new Error("parseKeybinding returned null in a test that expected success");
}

function evt(init: Partial<KeyboardEvent>): KeyboardEvent {
	return {
		key: "",
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		...init,
	} as KeyboardEvent;
}

describe("parseKeybinding", () => {
	test("parses mod+s", () => {
		expect(parseKeybinding("mod+s")).toEqual({
			key: "s",
			cmd: false,
			ctrl: false,
			mod: true,
			shift: false,
			alt: false,
		});
	});

	test("parses cmd+shift+k case-insensitively", () => {
		const result = parseKeybinding("CMD+Shift+K");
		expect(result?.key).toBe("k");
		expect(result?.cmd).toBe(true);
		expect(result?.shift).toBe(true);
	});

	test("treats meta and command as cmd", () => {
		expect(parseKeybinding("meta+a")?.cmd).toBe(true);
		expect(parseKeybinding("command+a")?.cmd).toBe(true);
	});

	test("returns null when no key segment is present", () => {
		expect(parseKeybinding("mod")).toBeNull();
		expect(parseKeybinding("")).toBeNull();
	});
});

describe("matchesKeybinding", () => {
	test("mod+s matches cmd+s on mac", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "s", metaKey: true }))).toBe(true);
	});

	test("mod+s matches ctrl+s on linux/win", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "s", ctrlKey: true }))).toBe(true);
	});

	test("mod+s rejects plain s", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "s" }))).toBe(false);
	});

	test("mod+s rejects extra shift", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "s", metaKey: true, shiftKey: true }))).toBe(
			false,
		);
	});

	test("cmd+s rejects ctrl+s", () => {
		const spec = parseKeybinding("cmd+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "s", ctrlKey: true }))).toBe(false);
		expect(matchesKeybinding(spec, evt({ key: "s", metaKey: true }))).toBe(true);
	});

	test("mod+s matches on a non-Latin layout via the physical key", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		expect(matchesKeybinding(spec, evt({ key: "і", code: "KeyS", ctrlKey: true }))).toBe(true);
		expect(matchesKeybinding(spec, evt({ key: "ы", code: "KeyS", metaKey: true }))).toBe(true);
	});

	test("an AltGr character does not match by its physical key", () => {
		const spec = parseKeybinding("mod+alt+s") ?? unreachable();
		// Polish AltGr+S types "ś" and reports ctrlKey + altKey.
		const polishAltGr = evt({ key: "ś", code: "KeyS", ctrlKey: true, altKey: true });
		expect(matchesKeybinding(spec, polishAltGr)).toBe(false);
	});

	test("an ASCII key is matched by layout, not by physical position", () => {
		const spec = parseKeybinding("mod+s") ?? unreachable();
		// Dvorak: the physical S key types "o".
		expect(matchesKeybinding(spec, evt({ key: "o", code: "KeyS", metaKey: true }))).toBe(false);
	});
});
