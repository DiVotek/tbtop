import { createAdmin } from "@tbtop/admin-node";
import { pages } from "@tbtop/admin-node/example/posts";

/** One admin instance per process; the host owns auth and hands the user over. */
export const admin = createAdmin({
	prefix: "/admin",
	brand: "tbtop · node",
	pages,
	user: () => ({ name: "Max", email: "admin@admin.com" }),
});
