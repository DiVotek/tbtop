import { expect, test } from "bun:test";
import { cn } from "./cn";

test("cn joins truthy class values", () => {
	expect(cn("a", "b")).toBe("a b");
});

test("cn merges conflicting tailwind classes (last wins)", () => {
	expect(cn("p-2", "p-4")).toBe("p-4");
});

test("cn drops falsy values", () => {
	// oxlint-disable-next-line no-constant-binary-expression -- falsy inputs are the test
	expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
});
