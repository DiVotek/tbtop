import { describe, expect, test } from "bun:test";
import { registerTableColor, resolveColorClasses } from "./colorRegistry";

describe("colorRegistry", () => {
	test("resolves built-in gray", () => {
		const c = resolveColorClasses("gray");
		expect(c.bg).toBe("bg-muted");
		expect(c.text).toBe("text-muted-foreground");
	});

	test("resolves built-in success", () => {
		const c = resolveColorClasses("success");
		expect(c.bg).toBe("bg-success");
		expect(c.text).toBe("text-success-foreground");
	});

	test("danger maps to destructive classes", () => {
		const c = resolveColorClasses("danger");
		expect(c.bg).toBe("bg-destructive");
	});

	test("undefined name returns fallback", () => {
		const c = resolveColorClasses(undefined);
		expect(c.bg).toBe("bg-muted");
	});

	test("unknown name returns fallback", () => {
		const c = resolveColorClasses("totally-unknown-xyz");
		expect(c.bg).toBe("bg-muted");
	});

	test("registerTableColor makes custom color resolvable", () => {
		registerTableColor("brand", { bg: "bg-brand-500", text: "text-white" });
		const c = resolveColorClasses("brand");
		expect(c.bg).toBe("bg-brand-500");
		expect(c.text).toBe("text-white");
	});
});
