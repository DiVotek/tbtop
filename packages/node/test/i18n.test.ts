import { describe, expect, test } from "bun:test";
import { driver, hostRules, pages } from "../example/posts";
import { cookieSessions, createAdmin } from "../src";
import { browser, visitPage } from "./support/browser";

const admin = createAdmin({
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
