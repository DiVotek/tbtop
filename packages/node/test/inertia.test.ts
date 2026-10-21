import { beforeEach, describe, expect, test } from "bun:test";
import { db, driver, hostRules, pages } from "../example/posts";
import { createAdmin, definePage, type InertiaPage, memorySessions, SESSION_USER } from "../src";

const seed = structuredClone(db.posts);
beforeEach(() => {
	db.posts = structuredClone(seed);
});

const login = definePage({
	path: "login",
	title: "Sign in",
	layout: "center",
	public: true,
	view: (s) =>
		s.form("login", [s.text("email").required()]).onSubmit(async (ctx) => {
			await (await admin.session(ctx.request)).set(SESSION_USER, { email: ctx.form.email });
			return "/admin/posts";
		}),
});

const admin = createAdmin({
	prefix: "/admin",
	pages: [...pages, login],
	driver,
	hostRules,
	session: memorySessions(),
	loginPath: "/admin/login",
	version: "v1",
});

/** A browser: keeps the session cookie, speaks Inertia when asked, follows nothing. */
function browser() {
	let cookie = "";
	return async (url: string, init: RequestInit & { inertia?: boolean } = {}) => {
		const headers = new Headers(init.headers);
		headers.set("cookie", cookie);
		if (init.inertia === true) {
			headers.set("x-inertia", "true");
			headers.set("x-inertia-version", "v1");
		}
		const res = await admin.handle(new Request(`http://x${url}`, { ...init, headers }));
		if (res === null) {
			throw new TypeError(`${url} fell through`);
		}
		cookie = res.headers.get("set-cookie")?.split(";")[0] ?? cookie;
		return res;
	};
}

async function signedIn() {
	const visit = browser();
	await visit("/admin/login/forms/login", {
		method: "POST",
		body: JSON.stringify({ email: "max@x.dev" }),
		inertia: true,
	});
	return visit;
}

const post = (body: unknown) => ({
	method: "POST",
	body: JSON.stringify(body),
	inertia: true,
	headers: { referer: "http://x/admin/posts/2/edit" },
});

describe("Inertia protocol", () => {
	test("a guest is sent to the login page; the login page itself is public", async () => {
		const visit = browser();
		const res = await visit("/admin/posts");
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("/admin/login");
		expect((await visit("/admin/login")).status).toBe(200);
		expect((await visit("/admin/posts/tables/posts")).status).toBe(401);
	});

	test("first load is HTML with the page object; a visit gets the JSON page", async () => {
		const visit = await signedIn();
		const html = await (await visit("/admin/posts/2/edit")).text();
		const json = /<script data-page="app" type="application\/json">(.*?)<\/script>/.exec(html);
		const page = JSON.parse(json?.[1] ?? "null") as InertiaPage;
		expect(page).toMatchObject({
			component: "admin/page",
			url: "/admin/posts/2/edit",
			version: "v1",
		});
		expect(page.props.tbtop).toMatchObject({ user: { email: "max@x.dev" } });

		const res = await visit("/admin/posts/2/edit", { inertia: true });
		expect(res.headers.get("x-inertia")).toBe("true");
		expect(((await res.json()) as InertiaPage).props.data).toMatchObject({ post: { id: 2 } });
	});

	test("a stale asset version answers 409 with the URL to reload", async () => {
		const visit = await signedIn();
		const res = await visit("/admin/posts", { headers: { "x-inertia": "true" } });
		expect(res.status).toBe(409);
		expect(res.headers.get("x-inertia-location")).toBe("http://x/admin/posts");
	});

	test("a partial reload keeps only the asked props, plus errors", async () => {
		const visit = await signedIn();
		const res = await visit("/admin/posts", {
			inertia: true,
			headers: {
				"x-inertia-partial-component": "admin/page",
				"x-inertia-partial-data": "data",
			},
		});
		expect(Object.keys(((await res.json()) as InertiaPage).props).sort()).toEqual([
			"data",
			"errors",
		]);
	});

	test("invalid submit: back, then the next visit carries the first message per field, once", async () => {
		const visit = await signedIn();
		const res = await visit(
			"/admin/posts/2/edit/forms/post",
			post({ title: "", slug: "hello-world", status: "nope" }),
		);
		expect([res.status, res.headers.get("location")]).toEqual([
			303,
			"http://x/admin/posts/2/edit",
		]);
		const page = (await (
			await visit("/admin/posts/2/edit", { inertia: true })
		).json()) as InertiaPage;
		expect(page.props.errors).toEqual({
			title: "The Title field is required.",
			slug: "The Slug has already been taken.",
			status: "The selected Status is invalid.",
		});
		const again = (await (
			await visit("/admin/posts/2/edit", { inertia: true })
		).json()) as InertiaPage;
		expect(again.props.errors).toEqual({});
	});

	test("an error bag header nests the errors under it", async () => {
		const visit = await signedIn();
		await visit("/admin/posts/2/edit/forms/post", {
			...post({ title: "" }),
			headers: { "x-inertia-error-bag": "edit" },
		});
		const page = (await (
			await visit("/admin/posts/2/edit", { inertia: true })
		).json()) as InertiaPage;
		expect(Object.keys(page.props.errors as object)).toEqual(["edit"]);
	});

	test("valid submit: declared keys only, effects flashed for the next page only", async () => {
		const visit = await signedIn();
		const res = await visit(
			"/admin/posts/2/edit/forms/post",
			post({ title: "Renamed", slug: "renamed", status: "published", views: "", evil: 1 }),
		);
		expect(res.status).toBe(303);
		expect(db.find(2)).toEqual({
			id: 2,
			title: "Renamed",
			slug: "renamed",
			status: "published",
			views: 0,
		});
		const page = (await (
			await visit("/admin/posts/2/edit", { inertia: true })
		).json()) as InertiaPage;
		expect(page.flash).toEqual({
			"tbtop.effects": [{ kind: "notify", message: "Saved", level: "success" }],
		});
		const again = (await (
			await visit("/admin/posts/2/edit", { inertia: true })
		).json()) as InertiaPage;
		expect(again.flash).toEqual({});
	});

	test("a submit returning a URL redirects there; logout forgets the user", async () => {
		const visit = browser();
		const res = await visit("/admin/login/forms/login", {
			method: "POST",
			body: JSON.stringify({ email: "a@b.c" }),
			inertia: true,
		});
		expect(res.headers.get("location")).toBe("/admin/posts");
		expect((await visit("/admin/posts")).status).toBe(200);
		expect((await visit("/admin/logout", { method: "POST", inertia: true })).status).toBe(303);
		expect((await visit("/admin/posts")).headers.get("location")).toBe("/admin/login");
	});
});
