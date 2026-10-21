import { driver, hostRules, pages } from "../example/posts";
import { cookieSessions, createAdmin } from "../src";

// Build-only fixture: proves the core bundles for Cloudflare Workers
// (`bun run check:workers`). Not a deployable app.
const admin = createAdmin({
	prefix: "/admin",
	pages,
	driver,
	hostRules,
	session: cookieSessions({ secret: "workers-check-only-not-a-real-secret" }),
});

export default {
	async fetch(request: Request): Promise<Response> {
		return (await admin.handle(request)) ?? new Response("Not found", { status: 404 });
	},
};
