import { admin } from "./src/admin";

const port = Number(process.env.PORT ?? 3000);

// Any Web-standard server works: the admin is one fetch handler that returns
// null for URLs it does not own.
Bun.serve({
	port,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname.startsWith("/build/")) {
			const file = Bun.file(`public${pathname}`);
			return (await file.exists()) ? new Response(file) : new Response(null, { status: 404 });
		}
		if (pathname === "/") {
			return Response.redirect(new URL("/admin/posts", request.url), 302);
		}
		return (await admin.handle(request)) ?? new Response("Not found", { status: 404 });
	},
});
console.log(`admin on http://localhost:${port}/admin`);
