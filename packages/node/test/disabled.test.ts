import { describe, expect, test } from "bun:test";
import { S } from "../src";

const s = new S();
const meta = (builder: { toJSON(): unknown }) =>
	(builder.toJSON() as { meta?: Record<string, unknown> }).meta ?? {};

describe("disabled() (WithMeta::disabled)", () => {
	test("disabled() serializes meta.disabled: true", () => {
		expect(meta(s.text("title").disabled()).disabled).toBe(true);
	});

	test("a closure resolves when the node serializes", () => {
		expect(meta(s.text("title").disabled(() => true)).disabled).toBe(true);
		expect(
			meta(
				s
					.stat("Posts")
					.value(1)
					.disabled(() => true),
			).disabled,
		).toBe(true);
		expect(
			meta(
				s
					.action("publish")
					.url("/x")
					.disabled(() => false),
			).disabled,
		).toBe(false);
	});

	test("meta('disabled', 0) is cast to a bool, as in PHP", () => {
		expect(meta(s.text("title").meta("disabled", 0)).disabled).toBe(false);
		expect(meta(s.text("title").meta("disabled", "0")).disabled).toBe(false);
		expect(meta(s.text("title").meta("disabled", 1)).disabled).toBe(true);
	});

	test("no disabled key without disabled()", () => {
		expect(meta(s.text("title"))).not.toHaveProperty("disabled");
	});
});
