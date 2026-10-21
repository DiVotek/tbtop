import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import {
	cookieSessions,
	createAdmin,
	definePage,
	memoryNotifications,
	Notification,
	NotificationAction,
	type NotificationStore,
	SESSION_USER,
} from "../src";
import { kyselyNotifications } from "../src/adapters/kysely";
import { browser, type Visit, visitPage } from "./support/browser";

/** Laravel's `notifications` migration, as SQLite. */
function laravelTable(): Kysely<unknown> {
	const sqlite = new Database(":memory:");
	sqlite.run(`create table notifications (
		id varchar primary key, type varchar not null, notifiable_type varchar not null,
		notifiable_id integer not null, data text not null, read_at datetime null,
		created_at datetime null, updated_at datetime null)`);
	return new Kysely({ dialect: new BunSqliteDialect({ database: sqlite }) });
}

const ada = { id: 1, name: "Ada" };
const bob = { id: 2, name: "Bob" };

function panel(store: NotificationStore) {
	const admin = createAdmin({
		prefix: "/admin",
		session: cookieSessions({ secret: "notifications-test-secret-0123456789" }),
		notifications: { store, pollInterval: 15 },
		pages: [
			definePage({
				path: "login",
				title: "Login",
				public: true,
				view: (s) =>
					s.form("login", [s.number("id")]).onSubmit(async (ctx) => {
						const user = ctx.form.id === 2 ? bob : ada;
						await (await admin.session(ctx.request)).set(SESSION_USER, user);
					}),
			}),
		],
	});
	return admin;
}

async function signIn(admin: ReturnType<typeof panel>, id: number): Promise<Visit> {
	const visit = browser(admin);
	await visit("/admin/login/forms/login", {
		method: "POST",
		body: JSON.stringify({ id }),
		inertia: true,
	});
	return visit;
}

const list = async (visit: Visit) =>
	(await (await visit("/admin/api/notifications")).json()) as {
		data: { id: string; title: string; readAt: string | null; actions: unknown[] }[];
		unreadCount: number;
	};

for (const [name, makeStore] of [
	["memory", () => memoryNotifications()],
	["kysely (Laravel table)", () => kyselyNotifications(laravelTable())],
] as const) {
	describe(`notifications on ${name}`, () => {
		test("sent per user; the bell lists the user's own, newest first, with the unread count", async () => {
			const store = makeStore();
			const admin = panel(store);
			await Notification.make().title("Older").sendTo(store, [ada]);
			await Bun.sleep(1100);
			await Notification.make()
				.title("Booking confirmed")
				.body("Car #42")
				.success()
				.actions([
					NotificationAction.make("View").url("/admin/bookings/42").openUrlInNewTab(),
				])
				.sendTo(store, [ada, bob]);
			const { data, unreadCount } = await list(await signIn(admin, 1));
			expect(unreadCount).toBe(2);
			expect(data.map((n) => n.title)).toEqual(["Booking confirmed", "Older"]);
			expect(data[0]).toMatchObject({
				body: "Car #42",
				color: "success",
				icon: null,
				readAt: null,
				actions: [{ label: "View", url: "/admin/bookings/42", newTab: true }],
			});
			expect((await list(await signIn(admin, 2))).unreadCount).toBe(1);
		});

		test("mark read, delete one, delete all: scoped to the owner", async () => {
			const store = makeStore();
			const admin = panel(store);
			await Notification.make().title("A").sendTo(store, [ada]);
			await Notification.make().title("B").sendTo(store, [ada]);
			const visit = await signIn(admin, 1);
			const [first, second] = (await list(visit)).data;
			expect(
				(
					await (
						await signIn(admin, 2)
					)(`/admin/api/notifications/${first?.id}/read`, { method: "POST" })
				).status,
			).toBe(404);
			expect(
				(await visit(`/admin/api/notifications/${first?.id}/read`, { method: "POST" }))
					.status,
			).toBe(204);
			expect((await list(visit)).unreadCount).toBe(1);
			expect(
				(await visit(`/admin/api/notifications/${second?.id}`, { method: "DELETE" }))
					.status,
			).toBe(204);
			expect((await list(visit)).data).toHaveLength(1);
			expect((await visit("/admin/api/notifications", { method: "DELETE" })).status).toBe(
				204,
			);
			expect((await list(visit)).data).toEqual([]);
		});

		test("guests get 404; the poll interval reaches the shared props", async () => {
			const admin = panel(makeStore());
			expect((await browser(admin)("/admin/api/notifications")).status).toBe(404);
			const page = await visitPage(browser(admin), "/admin/login");
			expect((page.props.tbtop as { notifications: unknown }).notifications).toEqual({
				pollInterval: 15000,
			});
		});
	});
}
