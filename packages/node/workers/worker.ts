import { driver, hostRules, pages } from "../example/posts";
import { cookieSessions, createAdmin, definePage, memoryDisk } from "../src";

// Build-only fixture: proves the core runs on Cloudflare Workers
// (`bun run check:workers`). Not a deployable app.
const files = definePage({
	path: "files",
	title: "Files",
	view: (s) => s.form("files", [s.upload("doc").visibility("private").directory("docs")]),
});

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	pages: [...pages, files],
	driver,
	hostRules,
	session: cookieSessions({ secret: "workers-check-only-not-a-real-secret" }),
	secret: "workers-check-only-app-key",
	disks: { public: memoryDisk() },
	locales: ["en", "uk"],
	mcp: {
		authenticate: (request) =>
			request.headers.get("authorization") === "Bearer check" ? { name: "agent" } : null,
	},
});

export default {
	async fetch(request: Request): Promise<Response> {
		return (await admin.handle(request)) ?? new Response("Not found", { status: 404 });
	},
};
