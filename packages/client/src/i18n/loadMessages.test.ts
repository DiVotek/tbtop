import { expect, test } from "bun:test";
import { loadMessages } from "./loadMessages";

test("loadMessages returns the messages object when the loader resolves to a plain map", async () => {
	const messages = await loadMessages(async () => ({ "action.save": "Save" }));
	expect(messages).toEqual({ "action.save": "Save" });
});

test("loadMessages unwraps the ESM default export when the loader resolves to a module shape", async () => {
	const messages = await loadMessages(async () => ({
		default: { "action.save": "Save" },
	}));
	expect(messages).toEqual({ "action.save": "Save" });
});

test("loadMessages treats a literal 'default' string key as a regular message, not a wrapper", async () => {
	const messages = await loadMessages(async () => ({
		default: "fallback value",
		"action.save": "Save",
	}));
	expect(messages).toEqual({ default: "fallback value", "action.save": "Save" });
});
