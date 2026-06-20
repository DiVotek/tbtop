import { afterEach, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";

GlobalRegistrator.register({ url: "http://localhost/" });
afterEach(() => {
	cleanup();
	mock.restore();
});

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
