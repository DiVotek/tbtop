import { expect, test } from "bun:test";
import { getBlockDescriptor } from "../index";

// Runs after consumerIsolation.a.test.tsx, which registers this kind. If that
// file's clearBlockRegistry() did not take effect, the descriptor leaks here
// and a consumer's tests become order-dependent.
test("ConsumerIsolation: a custom block from another test file did not leak in", () => {
	expect(getBlockDescriptor("consumerIsolationWidget")).toBeUndefined();
});
