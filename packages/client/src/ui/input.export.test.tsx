// Regression test for Bug 4: Input primitive must be exported from the package
// so custom components (like the demo Rating field) can reuse it without falling
// back to a bare <input> with different visual style.
import { expect, test } from "bun:test";
import { render } from "@testing-library/react";
// Import from the package root (public surface) — this will fail to compile if
// Input is not exported.
import { Input } from "..";

test("Input: exported from package index with data-slot attribute", () => {
	const { container } = render(<Input type="number" min={1} max={5} defaultValue={3} />);
	const el = container.querySelector('[data-slot="input"]') as HTMLInputElement;
	expect(el).not.toBeNull();
	expect(el.type).toBe("number");
	expect(el.min).toBe("1");
	expect(el.max).toBe("5");
});
