import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { admin } from "./admin/admin.server";

// The admin endpoint cluster (forms/actions/tables) answers first; everything
// else, admin page GETs included, is TanStack Start's.
export default createServerEntry({
	async fetch(request) {
		return (await admin.handle(request)) ?? handler.fetch(request);
	},
});
