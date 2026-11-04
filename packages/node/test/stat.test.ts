import { describe, expect, test } from "bun:test";
import { materialize, S, type Stat } from "../src";

const s = new S();
const period = () =>
	s
		.select("period")
		.options([{ value: "7d", label: "7 days" }])
		.default("7d");

async function options(stat: Stat): Promise<Record<string, unknown>> {
	return ((await materialize(stat.toJSON())) as { options: Record<string, unknown> }).options;
}

describe("Stat.params()", () => {
	test("emits field nodes and stamps source without poll", async () => {
		const opts = await options(s.stat("Signups").value(1).params([period()]));
		expect(opts.source).toBe("Signups");
		expect(opts).not.toHaveProperty("poll");
		const params = opts.params as {
			kind: string;
			name: string;
			options: { default: unknown };
		}[];
		expect(params).toHaveLength(1);
		expect(params[0]).toMatchObject({ kind: "select", name: "period" });
		expect(params[0]?.options.default).toBe("7d");
	});

	test("without params no params key is emitted", async () => {
		expect(await options(s.stat("Plain").value(1))).not.toHaveProperty("params");
	});

	test("the value closure renders with the params defaults, null without one", async () => {
		const stat = s
			.stat("Signups")
			.value((params) => `for ${String(params.period)} ${String(params.from)}`)
			.params([s.select("period").default("30d"), s.date("from")]);
		expect((await options(stat)).value).toBe("for 30d null");
	});

	test("the query closure exists with params alone and passes them on", async () => {
		const stat = s
			.stat("Signups")
			.value((params) => `for ${String(params.period)}`)
			.params([period()]);
		expect(await stat.queryClosure()?.({ period: "90d" })).toEqual({ value: "for 90d" });
	});

	test("a zero-argument value closure still works with params", async () => {
		const stat = s
			.stat("Signups")
			.value(() => 9)
			.params([period()]);
		expect((await options(stat)).value).toBe(9);
		expect(await stat.queryClosure()?.({ period: "7d" })).toEqual({ value: 9 });
	});

	test("url() combined with params() throws", () => {
		expect(() =>
			s.stat("Signups").value(1).url("/admin/users").params([period()]).toNode(),
		).toThrow("cannot combine url() with params()");
	});
});
