import { describe, expect, test } from "bun:test";
import { cookieSessions } from "../src";

const SECRET = "a-test-secret-that-is-long-enough!!";
const sessions = cookieSessions({ secret: SECRET });

async function roundTrip(
	cookie: string,
	change: (s: Awaited<ReturnType<typeof sessions>>) => void,
) {
	const session = await sessions(new Request("http://x/", { headers: { cookie } }));
	change(session);
	const res = (await session.commit?.(new Response(null))) ?? new Response(null);
	return res.headers.get("set-cookie");
}

const valueOf = (line: string | null) => line?.split(";")[0] ?? "";

describe("cookieSessions", () => {
	test("what is set comes back on the next request, encrypted", async () => {
		const line = await roundTrip("", (s) => s.set("user", { email: "max@x.dev" }));
		expect(line).toContain("HttpOnly");
		expect(line).not.toContain("max@x.dev");
		const next = await sessions(
			new Request("http://x/", { headers: { cookie: valueOf(line) } }),
		);
		expect(next.get("user")).toEqual({ email: "max@x.dev" });
	});

	test("an untouched session writes no cookie; emptying it expires the cookie", async () => {
		const line = await roundTrip("", (s) => s.set("user", 1));
		expect(await roundTrip(valueOf(line), () => {})).toBeNull();
		expect(await roundTrip(valueOf(line), (s) => s.forget("user"))).toContain("Max-Age=0");
	});

	test("a tampered cookie or another secret reads as an empty session", async () => {
		const value = valueOf(await roundTrip("", (s) => s.set("user", 1)));
		const tampered = `${value.slice(0, -2)}xx`;
		const read = async (cookie: string, resolver = sessions) =>
			(await resolver(new Request("http://x/", { headers: { cookie } }))).get("user");
		expect(await read(tampered)).toBeUndefined();
		expect(await read(value, cookieSessions({ secret: `${SECRET}-rotated` }))).toBeUndefined();
	});

	test("short secrets and oversized sessions fail loudly", async () => {
		expect(() => cookieSessions({ secret: "short" })).toThrow(TypeError);
		expect(roundTrip("", (s) => s.set("blob", "x".repeat(5000)))).rejects.toThrow(RangeError);
	});
});
