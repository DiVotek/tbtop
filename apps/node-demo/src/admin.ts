import {
	createAdmin,
	definePage,
	Effects,
	memorySessions,
	rootView,
	SESSION_USER,
	type ViteManifest,
	viteTags,
} from "@tbtop/admin";
import { driver, hostRules, pages } from "@tbtop/admin/example/posts";

const production = process.env.NODE_ENV === "production";
const ENTRY = "src/client.tsx";
const MANIFEST = "public/build/.vite/manifest.json";

/** The Inertia asset version: a hash of the build manifest, so a deploy reloads open tabs. */
async function buildVersion(): Promise<string | null> {
	if (!production) {
		return null;
	}
	return Bun.hash(await Bun.file(MANIFEST).text()).toString(36);
}

async function assets(): Promise<string> {
	if (!production) {
		return viteTags({ entry: ENTRY, devServer: "http://localhost:5173" });
	}
	const manifest = (await Bun.file(MANIFEST).json()) as ViteManifest;
	return viteTags({ entry: ENTRY, manifest });
}

const DEMO_PASSWORD = "password";

/**
 * DEMO ONLY: any email signs in with the shared demo password. Never deploy this page;
 * the server binds to loopback for that reason. A real app checks a password hash.
 */
const login = definePage({
	path: "login",
	title: "Sign in",
	layout: "center",
	public: true,
	view: (s) =>
		s
			.form("login", [
				s.text("email").label("Email").required().rules("email"),
				s.password("password").label("Password").required(),
				s.actionsRow([s.action("signIn").label("Sign in").color("primary").submit()]),
			])
			.onSubmit(async (ctx) => {
				if (ctx.form.password !== DEMO_PASSWORD) {
					return Effects.make().notify("Wrong password (the demo's is \"password\").", "error");
				}
				const email = String(ctx.form.email);
				await (await admin.session(ctx.request)).set(SESSION_USER, {
					name: email.split("@")[0],
					email,
				});
				return "/admin/posts";
			}),
});

export const admin = createAdmin({
	prefix: "/admin",
	brand: "tbtop · node",
	pages: [...pages, login],
	navigationGroups: [{ key: "Content", icon: "file-text", description: "Posts and drafts" }],
	navigationItems: [
		{ label: "Docs", url: "https://github.com/DiVotek/tbtop", icon: "book-open", newTab: true },
	],
	userMenuItems: [{ label: "Source", url: "https://github.com/DiVotek/tbtop", icon: "github" }],
	commandPalette: {
		commands: [{ label: "New post", url: "/admin/posts/new", icon: "plus", keywords: ["create"] }],
	},
	driver,
	hostRules,
	session: memorySessions({ secure: production }),
	loginPath: "/admin/login",
	version: await buildVersion(),
	rootView: rootView({ head: await assets() }),
});
