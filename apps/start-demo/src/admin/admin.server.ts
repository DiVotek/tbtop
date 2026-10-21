import { createAdmin } from "@tbtop/admin-node";
import { driver, hostRules, pages } from "@tbtop/admin-node/example/posts";

/** One admin instance per process; the host owns auth and hands the user over. */
export const admin = createAdmin({
	prefix: "/admin",
	brand: "tbtop · node",
	pages,
	driver: driver as never,
	hostRules,
	user: () => ({ name: "Max", email: "admin@admin.com" }),
});
