import { describe, expect, test } from "bun:test";
import { driver, hostRules, pages } from "../example/posts";
import { cookieSessions, createAdmin } from "../src";
import { browser, visitPage } from "./support/browser";

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	pages,
	driver,
	hostRules,
	session: cookieSessions({ secret: "an-i18n-test-secret-long-enough!!!" }),
	locales: ["en", "uk"],
	validationMessages: { uk: { required: "Поле :attribute обов'язкове." } },
	messages: { uk: { "app.greeting": "Привіт" } },
});

const tbtop = async (visit: ReturnType<typeof browser>) =>
	(await visitPage(visit, "/admin/posts")).props.tbtop as Record<string, unknown> & {
		messages: Record<string, string>;
	};

describe("UI locale", () => {
	test("the default locale ships its bundled messages and the offered locales", async () => {
		const shared = await tbtop(browser(admin));
		expect(shared).toMatchObject({ locale: "en", locales: ["en", "uk"] });
		expect(shared.messages["action.save"]).toBe("Save");
	});

	test("POST /locale switches the session; bundled and host strings follow", async () => {
		const visit = browser(admin);
		const res = await visit("/admin/locale", {
			method: "POST",
			body: JSON.stringify({ locale: "uk" }),
			inertia: true,
			headers: { referer: "http://x/admin/posts" },
		});
		expect([res.status, res.headers.get("location")]).toEqual([303, "http://x/admin/posts"]);
		const shared = await tbtop(visit);
		expect(shared.locale).toBe("uk");
		expect(shared.messages["action.save"]).toBe("Зберегти");
		expect(shared.messages["app.greeting"]).toBe("Привіт");
	});

	test("a locale the panel does not offer is refused through the errors bag", async () => {
		const visit = browser(admin);
		await visit("/admin/locale", {
			method: "POST",
			body: JSON.stringify({ locale: "fr" }),
			inertia: true,
		});
		const page = await visitPage(visit, "/admin/posts");
		expect(page.props.errors).toEqual({ locale: "The selected locale is invalid." });
		expect((page.props.tbtop as { locale: string }).locale).toBe("en");
	});

	test("validation messages use the request's locale", async () => {
		const visit = browser(admin);
		await visit("/admin/locale", {
			method: "POST",
			body: JSON.stringify({ locale: "uk" }),
			inertia: true,
		});
		await visit("/admin/posts/2/edit/forms/post", {
			method: "POST",
			body: JSON.stringify({ title: "", slug: "x", status: "draft" }),
			inertia: true,
		});
		const page = await visitPage(visit, "/admin/posts/2/edit");
		expect(page.props.errors).toEqual({ title: "Поле Title обов'язкове." });
	});
});

describe("per-user UI locale", () => {
	const saved = new Map<string, string>([["ann", "uk"]]);
	let who = "ann";
	const perUser = createAdmin({
		allowGuests: true,
		prefix: "/admin",
		pages,
		driver,
		session: cookieSessions({ secret: "an-i18n-test-secret-long-enough!!!" }),
		locales: ["en", "uk"],
		user: () => ({ id: who }),
		userLocale: (user) => saved.get((user as { id: string }).id) ?? null,
		onLocaleChange: (user, locale) => {
			saved.set((user as { id: string }).id, locale);
		},
	});

	test("the user's saved locale wins over the default on a fresh session", async () => {
		who = "ann";
		expect((await tbtop(browser(perUser))).locale).toBe("uk");
	});

	test("a switch saves the pick for the user, and another browser follows it", async () => {
		who = "bob";
		await browser(perUser)("/admin/locale", {
			method: "POST",
			body: JSON.stringify({ locale: "uk" }),
			inertia: true,
			headers: { referer: "http://x/admin/posts" },
		});
		expect(saved.get("bob")).toBe("uk");
		expect((await tbtop(browser(perUser))).locale).toBe("uk");
	});

	test("createAdmin() refuses userLocale without onLocaleChange", () => {
		expect(() =>
			createAdmin({ allowGuests: true, prefix: "/admin", pages, userLocale: () => "uk" }),
		).toThrow("userLocale and onLocaleChange go together");
	});

	test("a refused locale is not saved", async () => {
		who = "cat";
		await browser(perUser)("/admin/locale", {
			method: "POST",
			body: JSON.stringify({ locale: "fr" }),
			inertia: true,
			headers: { referer: "http://x/admin/posts" },
		});
		expect(saved.has("cat")).toBe(false);
	});
});
