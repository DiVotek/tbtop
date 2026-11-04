import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { cookieSessions, createAdmin, definePage, memorySessions, SESSION_USER } from "../src";

const at = (cookie: string | null) =>
	new Request("http://x/", { headers: cookie === null ? {} : { cookie } });
const cookieOf = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? null;

afterEach(() => setSystemTime());

describe("memorySessions", () => {
	test("a request that writes nothing sets no cookie", async () => {
		const sessions = memorySessions();
		const session = await sessions(at(null));
		expect(session.get("x")).toBeUndefined();
		expect((await session.commit?.(new Response()))?.headers.get("set-cookie")).toBeNull();
	});

	test("signing in moves the session to a new id; the old cookie is empty", async () => {
		const sessions = memorySessions();
		const first = await sessions(at(null));
		await first.set("locale", "uk");
		const before = cookieOf((await first.commit?.(new Response())) ?? new Response());
		const login = await sessions(at(before));
		await login.set(SESSION_USER, { name: "max" });
		const after = cookieOf((await login.commit?.(new Response())) ?? new Response());
		expect(after).not.toBe(before);
		expect((await sessions(at(after))).get("locale")).toBe("uk");
		expect((await sessions(at(before))).get(SESSION_USER)).toBeUndefined();
	});

	test("an idle session expires after its lifetime", async () => {
		const sessions = memorySessions({ lifetime: 60 });
		const session = await sessions(at(null));
		await session.set(SESSION_USER, "max");
		const cookie = cookieOf((await session.commit?.(new Response())) ?? new Response());
		setSystemTime(new Date(Date.now() + 61_000));
		expect((await sessions(at(cookie))).get(SESSION_USER)).toBeUndefined();
	});
});

describe("cookieSessions", () => {
	test("the expiry is sealed: a copied cookie stops working after maxAge", async () => {
		const sessions = cookieSessions({
			secret: "a-test-secret-that-is-long-enough!!",
			maxAge: 60,
		});
		const session = await sessions(at(null));
		await session.set(SESSION_USER, "max");
		const cookie = cookieOf((await session.commit?.(new Response())) ?? new Response());
		expect((await sessions(at(cookie))).get(SESSION_USER)).toBe("max");
		setSystemTime(new Date(Date.now() + 61_000));
		expect((await sessions(at(cookie))).get(SESSION_USER)).toBeUndefined();
	});

	test("a session past half its lifetime is resealed on the next response", async () => {
		const sessions = cookieSessions({
			secret: "a-test-secret-that-is-long-enough!!",
			maxAge: 60,
		});
		const session = await sessions(at(null));
		await session.set(SESSION_USER, "max");
		const cookie = cookieOf((await session.commit?.(new Response())) ?? new Response());
		setSystemTime(new Date(Date.now() + 40_000));
		const read = await sessions(at(cookie));
		expect((await read.commit?.(new Response()))?.headers.get("set-cookie")).toContain(
			"Max-Age=60",
		);
	});
});

describe("default sessions", () => {
	test("each panel keeps its own cookie, scoped to its prefix", async () => {
		const page = definePage({
			path: "login",
			title: "Login",
			public: true,
			view: (s) => s.text("x"),
		});
		const admin = createAdmin({ id: "admin", prefix: "/admin", pages: [page] });
		const session = await admin.session(new Request("http://x/admin/login"));
		await session.set(SESSION_USER, "max");
		const res = await session.commit?.(new Response());
		expect(res?.headers.get("set-cookie")).toMatch(/^tbtop_admin_session=[^;]+; Path=\/admin;/);
	});
});
