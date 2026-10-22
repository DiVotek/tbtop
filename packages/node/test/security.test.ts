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
