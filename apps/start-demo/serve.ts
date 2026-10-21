// Production on Bun: static client assets + the Start server entry (admin endpoints included).
import server from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);
Bun.serve({
	port,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname.startsWith("/assets/")) {
			const file = Bun.file(`./dist/client${pathname}`);
			if (await file.exists()) {
				return new Response(file);
			}
		}
		return server.fetch(request);
	},
});
console.log(`listening on http://localhost:${port}`);
