import { afterEach, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";
// Bun 1.3.14 links the circular @lexical/* ESM graph non-deterministically:
// without the core initialized first, @lexical/react imports can hit a TDZ
// ("Cannot access 'HISTORY_MERGE_TAG' before initialization"). Importing the
// core here pins the init order for every test file. It is SSR-safe, so
// running before the happy-dom registration below is fine.
import "lexical";

// @lexical/markdown never finishes linking under bun ("Cannot access
// 'HeadingNode' before initialization"), and a failed link is cached for the
// whole run — so it is stubbed here, before any file can load the editor.
// No test exercises markdown shortcuts; browser bundlers link it fine.
mock.module("@lexical/markdown", () => ({ TRANSFORMERS: [] }));
mock.module("@lexical/react/LexicalMarkdownShortcutPlugin", () => ({
	MarkdownShortcutPlugin: () => null,
}));

GlobalRegistrator.register({ url: "http://localhost/" });
afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Network tripwire (defense-in-depth). Tests must stub their own transport
// (ClientProvider fetch=, mock.module, etc.). Any genuinely-unstubbed global
// fetch/XHR fails loudly here instead of hanging on a real socket.
// ---------------------------------------------------------------------------

function describeUrl(input: unknown): string {
	if (typeof input === "string") {
		return input;
	}
	if (input instanceof URL) {
		return input.toString();
	}
	if (input instanceof Request) {
		return input.url;
	}
	return String(input);
}

globalThis.fetch = ((input: unknown): Promise<Response> => {
	return Promise.reject(
		new Error(`[test] network blocked: unstubbed fetch → ${describeUrl(input)}`),
	);
}) as typeof fetch;

class BlockedXMLHttpRequest {
	open(_method: string, url: unknown): void {
		throw new Error(`[test] network blocked: unstubbed XHR → ${describeUrl(url)}`);
	}
}

globalThis.XMLHttpRequest = BlockedXMLHttpRequest as unknown as typeof XMLHttpRequest;

// Radix UI primitives (DropdownMenu, Popover, etc.) call hasPointerCapture /
// setPointerCapture on DOM elements. happy-dom doesn't implement them, which
// crashes the test runner. Patch them onto HTMLElement here so Radix works.
if (typeof window !== "undefined") {
	window.HTMLElement.prototype.hasPointerCapture ??= () => false;
	window.HTMLElement.prototype.setPointerCapture ??= () => {};
	window.HTMLElement.prototype.releasePointerCapture ??= () => {};
}
