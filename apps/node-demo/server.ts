import { resolve, sep } from "node:path";
import { admin } from "./src/admin";

const BUILD = resolve("public/build");

const port = Number(process.env.PORT ?? 3000);
// Loopback only: the demo login uses a shared password. Set HOST to expose it.
const hostname = process.env.HOST ?? "127.0.0.1";

// Any Web-standard server works: the admin is one fetch handler that returns
// null for URLs it does not own.
Bun.serve({
	port,
	hostname,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname.startsWith("/build/")) {
			const path = resolve(`public${pathname}`);
			const file = Bun.file(path);
			const inside = path.startsWith(BUILD + sep);
			return inside && (await file.exists())
				? new Response(file)
				: new Response(null, { status: 404 });
		}
		if (pathname === "/") {
			return Response.redirect(new URL("/admin/posts", request.url), 302);
		}
		return (await admin.handle(request)) ?? new Response("Not found", { status: 404 });
	},
});
console.log(`admin on http://${hostname}:${port}/admin`);
