import { describe, expect, test } from "bun:test";
import {
	type AdminConfig,
	createAdmin,
	createPanels,
	definePage,
	HttpError,
	type InertiaPage,
	memorySessions,
	type PageDef,
	SESSION_USER,
} from "../src";
import { browser } from "./support/browser";

const page = (path: string, extra: Partial<PageDef> = {}): PageDef =>
	definePage({ path, title: path, view: (s) => s.stack([]), ...extra });

const pages = [
	page("dashboard", { nav: { label: "Dashboard", order: 1 } }),
	page("posts", { nav: { label: "Posts", group: "content", order: 2 } }),
	page("posts/drafts", { nav: { label: "Drafts", group: "content", parent: "posts" } }),
	page("tags", { nav: { label: "Tags", group: "content", section: "meta", order: 1 } }),
	page("users", { nav: { label: "Users", group: "people" } }),
	page("billing", {
		nav: { label: "Billing", group: "people" },
		authorize: () => false,
	}),
	page("audit", {
		nav: { label: "Audit", group: "people", parent: "billing" },
	}),
	page("posts/$post", { title: "Edit post", nav: { label: "Edit", group: "content" } }),
	page("missing", {
		view: () => {
			throw new HttpError(404, "No query results.");
		},
	}),
];

const panel = (config: Partial<AdminConfig> = {}) =>
	createAdmin({ prefix: "/admin", pages, version: "v1", allowGuests: true, ...config });

async function props(admin: ReturnType<typeof panel>, url: string) {
	const result = await admin.pageProps(new Request(`http://x${url}`));
	if (result instanceof Response) {
		throw new TypeError(`expected props, got ${result.status}`);
	}
	return result;
}

describe("navigation", () => {
	const admin = panel({
		navigationGroups: [
			{ key: "people", label: () => "People", icon: "users", collapsed: true },
			{ key: "content", label: "Content", sections: { meta: "Metadata" } },
		],
		navigationItems: [{ label: "Docs", url: "https://docs.x", newTab: true, sort: 5 }],
	});

	test("groups follow the declared order, after the ungrouped bucket", async () => {
		const nav = (await props(admin, "/admin/dashboard")).tbtop.nav as Record<string, unknown>[];
		expect(nav.map((group) => group.key)).toEqual(["", "people", "content"]);
		expect(nav[0]).toEqual({
			key: "",
			group: null,
			items: [
				{ label: "Dashboard", href: "/admin/dashboard", order: 1 },
				{ label: "Docs", href: "https://docs.x", order: 5, newTab: true },
			],
		});
	});

	test("children nest, sections follow the unsectioned run, a gated parent promotes its child", async () => {
		const [, people, content] = (await props(admin, "/admin/dashboard")).tbtop.nav as Record<
			string,
			unknown
		>[];
		expect(people).toEqual({
			key: "people",
			group: "People",
			items: [
				{ label: "Users", href: "/admin/users", order: 0 },
				{ label: "Audit", href: "/admin/audit", order: 0 },
			],
			icon: { name: "users", position: "left" },
			collapsible: true,
			collapsed: true,
		});
		expect(content).toEqual({
			key: "content",
			group: "Content",
			items: [
				{
					label: "Posts",
					href: "/admin/posts",
					order: 2,
					children: [{ label: "Drafts", href: "/admin/posts/drafts", order: 0 }],
				},
				{ label: "Tags", href: "/admin/tags", order: 1, section: "meta" },
			],
			sections: [{ key: "meta", label: "Metadata" }],
		});
	});

	test("an unknown parent fails for every visitor", async () => {
		const broken = panel({ pages: [page("a", { nav: { label: "A", parent: "nowhere" } })] });
		await expect(props(broken, "/admin/a")).rejects.toThrow('nav.parent "nowhere"');
	});

	test("breadcrumbs link the group to its first page the user may open", async () => {
		expect((await props(admin, "/admin/tags")).breadcrumbs).toEqual([
			{ label: "Content", url: "/admin/posts" },
			{ label: "tags" },
		]);
		expect((await props(admin, "/admin/users")).breadcrumbs).toEqual([
			{ label: "People", url: "/admin/audit" },
			{ label: "users" },
		]);
		expect((await props(admin, "/admin/dashboard")).breadcrumbs).toEqual([
			{ label: "dashboard" },
		]);
		expect(
			(await props(panel({ breadcrumbs: false }), "/admin/tags")).breadcrumbs,
		).toBeUndefined();
	});
});

describe("shell props", () => {
	test("defaults: stock chrome, palette with its hotkey, no appearance", async () => {
		const { tbtop } = await props(panel(), "/admin/dashboard");
		expect(tbtop).toMatchObject({
			panel: "admin",
			navigation: "sidebar",
			appearance: null,
			palette: { hotkey: "mod+k" },
			userMenuItems: [],
			chrome: {
				header: { kind: "flex", options: { align: "center" } },
				sidebar: { kind: "stack" },
				footer: null,
			},
		});
	});

	test("chrome items extend the defaults; config is sparse on the wire", async () => {
		const admin = panel({
			id: "ops",
			navigation: "topbar",
			appearance: { density: "compact", defaultThemeMode: "system", maxContentWidth: "7xl" },
			commandPalette: {
				includeNav: false,
				commands: [{ label: "Status", url: "/status", keywords: [] }],
			},
			userMenuItems: [{ label: "Profile", url: "/me", icon: "user", group: "ignored" }],
			chrome: { headerItems: (s, defaults) => [s.themeToggle(), ...defaults] },
		});
		const { tbtop } = await props(admin, "/admin/dashboard");
		expect(tbtop.panel).toBe("ops");
		expect(tbtop.navigation).toBe("topbar");
		expect(tbtop.appearance).toEqual({ maxWidth: "7xl", density: "compact" });
		expect(tbtop.palette).toEqual({
			hotkey: "mod+k",
			includeNav: false,
			commands: [{ label: "Status", href: "/status" }],
		});
		expect(tbtop.userMenuItems).toEqual([
			{ label: "Profile", href: "/me", icon: { name: "user", position: "left" } },
		]);
		const { header } = tbtop.chrome as {
			header: { options: { children: { kind: string }[] } };
		};
		expect(header.options.children.map((child) => child.kind)).toEqual([
			"themeToggle",
			"userMenu",
		]);
		expect(
			(await props(panel({ commandPalette: false }), "/admin/dashboard")).tbtop.palette,
		).toBe(null);
	});

	test("a server action in the chrome fails: it has no page to run on", async () => {
		const admin = panel({
			chrome: { footer: (s) => s.action("purge").handle(() => undefined) },
		});
		await expect(props(admin, "/admin/dashboard")).rejects.toThrow('server action "purge"');
	});

	test("unknown layouts and appearance values fail at createAdmin()", () => {
		expect(() => panel({ navigation: "drawer" as never })).toThrow(
			'Unknown navigation "drawer"',
		);
		expect(() => panel({ appearance: { density: "tight" as never } })).toThrow(
			"Unknown density",
		);
	});

	test("unsavedGuard: false reaches every form without its own setting", async () => {
		const admin = panel({
			unsavedGuard: false,
			pages: [page("f", { view: (s) => s.form("f", [s.text("a")]) })],
		});
		const structure = (await props(admin, "/admin/f")).structure;
		expect(structure).toMatchObject({ kind: "form", options: { guardUnsaved: false } });
	});
});

describe("panel root", () => {
	test("the bare prefix redirects to the first sidebar page, skipping external links", async () => {
		const admin = panel({
			navigationItems: [{ label: "Docs", url: "https://docs.x", newTab: true, sort: -1 }],
		});
		for (const url of ["/admin", "/admin/"]) {
			const res = await browser(admin)(url);
			expect([res.status, res.headers.get("location")]).toEqual([303, "/admin/dashboard"]);
		}
	});

	test("a gated-out first page is skipped; a nested page counts", async () => {
		const admin = panel({
			pages: [
				page("secret", { nav: { label: "Secret", order: 1 }, authorize: () => false }),
				page("reports", { nav: { label: "Reports", group: "ops" } }),
			],
		});
		expect((await browser(admin)("/admin")).headers.get("location")).toBe("/admin/reports");
	});

	test("a page on the root path wins; no sidebar page means the 404 page", async () => {
		const root = panel({ pages: [...pages, page("", { title: "Home" })] });
		expect((await browser(root)("/admin")).status).toBe(200);
		const empty = panel({ pages: [page("hidden")] });
		expect((await browser(empty)("/admin")).status).toBe(404);
	});
});

describe("root view", () => {
	const html = async (config: Partial<AdminConfig>) =>
		(await browser(panel(config))("/admin/dashboard")).text();

	test("<html> carries the locale and the default style preset; the theme resolves before paint", async () => {
		const doc = await html({});
		expect(doc).toContain('<html lang="en" class="style-preset-vega">');
		expect(doc).toContain("document.cookie.match(/tbtop_theme=([^;]*)/)");
		expect(doc).toContain('var t=m?m[1]:"system";');
	});

	test("appearance picks the preset and the default theme; dark mode off stays light", async () => {
		const doc = await html({ appearance: { stylePreset: "nova", defaultThemeMode: "dark" } });
		expect(doc).toContain('class="style-preset-nova"');
		expect(doc).toContain('var t=m?m[1]:"dark";');
		expect(await html({ appearance: { darkMode: false } })).toContain('var t="light";');
	});

	test("stylePreset is sparse on the wire and checked at createAdmin()", async () => {
		const tbtop = async (stylePreset: "vega" | "maia") =>
			(await props(panel({ appearance: { stylePreset } }), "/admin/dashboard")).tbtop;
		expect((await tbtop("vega")).appearance).toBe(null);
		expect((await tbtop("maia")).appearance).toEqual({ stylePreset: "maia" });
		expect(() => panel({ appearance: { stylePreset: "neo" as never } })).toThrow(
			'Unknown style preset "neo"',
		);
	});
});

describe("error page", () => {
	const login = page("login", { public: true, layout: "center" });
	const admin = panel({
		pages: [...pages, login],
		loginPath: "/admin/login",
		session: memorySessions(),
		user: (_, session) => session.get(SESSION_USER),
	});

	test("an unknown URL under the prefix is the 404 page; a guest gets no shell", async () => {
		const visit = browser(admin);
		const res = await visit("/admin/nope", { inertia: true });
		expect(res.status).toBe(404);
		const body = (await res.json()) as InertiaPage;
		expect(body.component).toBe("admin/error");
		expect(body.props).toMatchObject({
			status: 404,
			title: "Page not found",
			layout: "center",
		});
		expect((await visit("/admin/nope")).headers.get("content-type")).toContain("text/html");
	});

	test("a 404 a page raises renders inside the shell for a signed-in user", async () => {
		const signedIn = panel({ user: () => ({ name: "Max" }) });
		const res = await browser(signedIn)("/admin/missing", { inertia: true });
		expect(res.status).toBe(404);
		const body = (await res.json()) as InertiaPage;
		expect(body.component).toBe("admin/error");
		expect(body.props).toMatchObject({
			layout: "admin",
			message: "The page you are looking for does not exist or has moved.",
		});
	});

	test("a page the user may not open renders the 403 page, not raw JSON", async () => {
		const signedIn = panel({ user: () => ({ name: "Max" }) });
		const res = await browser(signedIn)("/admin/billing");
		expect(res.status).toBe(403);
		expect(res.headers.get("content-type")).toContain("text/html");
		const page = await browser(signedIn)("/admin/billing", { inertia: true });
		expect(((await page.json()) as InertiaPage).props).toMatchObject({
			status: 403,
			title: "You do not have access to this page",
		});
	});

	test("a JSON client gets the host's 404, not the page", async () => {
		const res = await admin.handle(
			new Request("http://x/admin/nope", { headers: { accept: "application/json" } }),
		);
		expect(res).toBeNull();
	});
});

describe("several panels", () => {
	const main = panel();
	const billing = createAdmin({
		allowGuests: true,
		id: "billing",
		prefix: "/admin/billing",
		pages: [page("invoices")],
	});
	const host = createPanels([main, billing]);

	test("each URL goes to the panel that owns it, the nested one first", async () => {
		const res = await host.handle(new Request("http://x/admin/billing/invoices"));
		const html = await res?.text();
		expect(html).toContain(`"panel":"billing"`);
		expect((await host.handle(new Request("http://x/admin/dashboard")))?.status).toBe(200);
		expect(await host.handle(new Request("http://x/shop"))).toBeNull();
		expect(host.get("billing")).toBe(billing);
	});

	test("ids and prefixes are unique", () => {
		expect(() => createPanels([main, panel()])).toThrow('Duplicate panel id "admin"');
		expect(() => createPanels([main, panel({ id: "other" })])).toThrow(
			'Duplicate panel prefix "/admin"',
		);
	});
});
