import { afterEach, describe, expect, test } from "bun:test";
import { driver, hostRules, pages } from "../example/posts";
import { cookieSessions, createAdmin, validate } from "../src";
import { phpQuery } from "../src/server/http";

const SECRET = "security-test-secret-0123456789abcdef";
const admin = createAdmin({
	prefix: "/admin",
	pages,
	driver,
	hostRules,
	session: cookieSessions({ secret: SECRET }),
	loginPath: "/admin/login",
});

const polluted = () => ({}) as Record<string, unknown>;

afterEach(() => {
	for (const key of ["user", "name", "evil"]) {
		delete (Object.prototype as Record<string, unknown>)[key];
	}
});

describe("prototype pollution", () => {
	test("a __proto__ query key neither pollutes Object.prototype nor signs a guest in", async () => {
		phpQuery(new URLSearchParams("__proto__[user]=evil&constructor[prototype][user]=evil"));
		expect(polluted().user).toBeUndefined();
		const guest = await admin.handle(new Request("http://x/admin/posts"));
		expect(guest?.status).toBe(303);
	});

	test("query parsing keeps ordinary nested keys and ignores inherited ones", () => {
		const query = phpQuery(new URLSearchParams("filters[status][]=a&toString[x]=1"));
		expect(query).toEqual({ filters: { status: ["a"] }, toString: { x: "1" } });
		expect(typeof Object.prototype.toString).toBe("function");
	});

	test("a __proto__ key in a validated body stays out of the prototype", async () => {
		const body = JSON.parse('{"items":{"__proto__":{"name":"evil"}}}');
		const result = await validate(body, { "items.*.name": ["required"] });
		expect(polluted().name).toBeUndefined();
		expect(result.ok).toBe(true);
	});
});

describe("cross-site requests", () => {
	const open = createAdmin({
		prefix: "/admin",
		pages,
		driver,
		hostRules,
		allowGuests: true,
		trustedOrigins: ["https://spa.example.com"],
	});
	const reorder = (headers: Record<string, string>) =>
		open.handle(
			new Request("http://admin.example.com/admin/posts/tables/posts/reorder", {
				method: "POST",
				body: JSON.stringify({ ids: [] }),
				headers: { "content-type": "application/json", ...headers },
			}),
		);

	test("a POST from another origin is refused; its own host and trusted origins pass", async () => {
		expect((await reorder({ origin: "https://evil.example" }))?.status).toBe(403);
		expect((await reorder({ origin: "null" }))?.status).toBe(403);
		expect((await reorder({ "sec-fetch-site": "cross-site" }))?.status).toBe(403);
		expect((await reorder({ origin: "http://admin.example.com" }))?.status).not.toBe(403);
		expect((await reorder({ origin: "https://spa.example.com" }))?.status).not.toBe(403);
		expect((await reorder({}))?.status).not.toBe(403);
	});
});

describe("guests", () => {
	test("without loginPath a panel is closed unless allowGuests opts in", async () => {
		const closed = createAdmin({ prefix: "/admin", pages, driver });
		expect((await closed.handle(new Request("http://x/admin/posts")))?.status).toBe(401);
		expect(
			(await closed.handle(new Request("http://x/admin/posts/tables/posts")))?.status,
		).toBe(401);
	});

	test("pageProps sends a guest to the login page, as the page route does", async () => {
		const props = await admin.pageProps(new Request("http://x/admin/posts"));
		expect(props instanceof Response && props.status).toBe(303);
	});
});

describe("malformed input", () => {
	test("a broken percent-escape in the path or the cookie is a 400 or a guest, not a 500", async () => {
		const open = createAdmin({ prefix: "/admin", pages, driver, allowGuests: true });
		expect((await open.handle(new Request("http://x/admin/posts/%E0/edit")))?.status).toBe(400);
		const res = await admin.handle(
			new Request("http://x/admin/posts", { headers: { cookie: "tbtop_session=%E0" } }),
		);
		expect(res?.status).toBe(303);
	});
});
