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
		expect(c.icon).toBe("text-success");
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

	test("registerTableColor without icon falls back to text (back-compat)", () => {
		registerTableColor("brand-no-icon", { bg: "bg-brand-500", text: "text-white" });
		const c = resolveColorClasses("brand-no-icon");
		expect(c.icon).toBe("text-white");
	});

	test("registerTableColor honors an explicit icon color", () => {
		registerTableColor("brand-with-icon", {
			bg: "bg-brand-500",
			text: "text-white",
			icon: "text-brand-500",
		});
		const c = resolveColorClasses("brand-with-icon");
		expect(c.icon).toBe("text-brand-500");
	});
});
