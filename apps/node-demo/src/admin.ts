import {
	createAdmin,
	definePage,
	memorySessions,
	rootView,
	SESSION_USER,
	type ViteManifest,
	viteTags,
} from "@tbtop/admin-node";
import { driver, hostRules, pages } from "@tbtop/admin-node/example/posts";

const production = process.env.NODE_ENV === "production";
const ENTRY = "src/client.tsx";

async function assets(): Promise<string> {
	if (!production) {
		return viteTags({ entry: ENTRY, devServer: "http://localhost:5173" });
	}
	const manifest = (await Bun.file("public/build/.vite/manifest.json").json()) as ViteManifest;
	return viteTags({ entry: ENTRY, manifest });
}

/** The host owns auth: this demo trusts any email, a real app checks a password hash. */
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
	version: production ? "build" : null,
	rootView: rootView({ head: await assets() }),
});
