import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";

GlobalRegistrator.register({ url: "http://localhost/" });
afterEach(() => cleanup());

// Radix UI primitives (DropdownMenu, Popover, etc.) call hasPointerCapture /
// setPointerCapture on DOM elements. happy-dom doesn't implement them, which
// crashes the test runner. Patch them onto HTMLElement here so Radix works.
if (typeof window !== "undefined") {
	window.HTMLElement.prototype.hasPointerCapture ??= () => false;
	window.HTMLElement.prototype.setPointerCapture ??= () => {};
	window.HTMLElement.prototype.releasePointerCapture ??= () => {};
}
