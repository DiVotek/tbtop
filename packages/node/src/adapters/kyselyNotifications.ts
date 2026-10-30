import type { Kysely } from "kysely";
import type { NotificationData } from "../notifications/notification";
import type { NotificationStore, StoredNotification } from "../notifications/store";

export interface KyselyNotificationsOptions {
	table?: string;
	/** `notifiable_type`; Laravel's morph class when the table is shared with a Laravel app. */
	notifiableType?: string;
	/** `notifiable_id` of a user; default `user.id`. */
	keyOf?: (user: unknown) => string | number;
}

interface NotificationRow {
	id: string;
	type: string;
	notifiable_type: string;
	notifiable_id: string | number;
	data: string;
	read_at: string | null;
	created_at: string;
	updated_at: string;
}

type Db = Kysely<Record<string, NotificationRow>>;

/** Laravel's `Y-m-d H:i:s`, UTC. */
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const parse = (stamp: string | null) =>
	stamp === null ? null : new Date(`${stamp.replace(" ", "T")}Z`);

/**
 * The bell's store on Laravel's `notifications` table, so a Bun admin and a
 * Laravel app can share one database: same columns, JSON `data`, the same
 * DatabaseNotification type string.
 */
export function kyselyNotifications<DB>(
	db: Kysely<DB>,
	options: KyselyNotificationsOptions = {},
): NotificationStore {
	return new KyselyNotificationStore(db as unknown as Db, options);
}

class KyselyNotificationStore implements NotificationStore {
	private readonly table: string;
	private readonly morph: string;
	private readonly keyOf: (user: unknown) => string | number;

	constructor(
		private readonly db: Db,
		options: KyselyNotificationsOptions,
	) {
		this.table = options.table ?? "notifications";
		this.morph = options.notifiableType ?? "App\\Models\\User";
		this.keyOf = options.keyOf ?? ((user) => (user as { id: string | number }).id);
	}

	private owner<Q extends { where: (...args: never[]) => Q }>(qb: Q, user: unknown): Q {
		const where = qb.where as unknown as (column: string, op: string, value: unknown) => Q;
		return where.call(
			where.call(qb, "notifiable_type", "=", this.morph),
			"notifiable_id",
			"=",
			this.keyOf(user),
		);
	}

	private select(user: unknown) {
		return this.owner(this.db.selectFrom(this.table), user);
	}

	async list(user: unknown, limit: number): Promise<StoredNotification[]> {
		const rows = await this.select(user)
			.selectAll()
			.orderBy("created_at", "desc")
			.limit(limit)
			.execute();
		return rows.map(decode);
	}

	async unreadCount(user: unknown): Promise<number> {
		const row = await this.select(user)
			.where("read_at", "is", null)
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirst();
		return Number(row?.count ?? 0);
	}

	/** markAsRead(): stamps an unread row; an already-read one stays as it was. */
	async markRead(user: unknown, id: string): Promise<boolean> {
		const exists = await this.select(user).where("id", "=", id).select("id").executeTakeFirst();
		if (exists === undefined) {
			return false;
		}
		await this.owner(this.db.updateTable(this.table), user)
			.set({ read_at: now(), updated_at: now() })
			.where("id", "=", id)
			.where("read_at", "is", null)
			.execute();
		return true;
	}

	async delete(user: unknown, id: string): Promise<boolean> {
		const result = await this.owner(this.db.deleteFrom(this.table), user)
			.where("id", "=", id)
			.executeTakeFirst();
		return Number(result.numDeletedRows) > 0;
	}

	async deleteAll(user: unknown): Promise<void> {
		await this.owner(this.db.deleteFrom(this.table), user).execute();
	}

	async send(users: unknown[], data: NotificationData): Promise<void> {
		if (users.length === 0) {
			return;
		}
		const stamp = now();
		const rows = users.map((user) => ({
			id: crypto.randomUUID(),
			type: "Tbtop\\Admin\\Notifications\\DatabaseNotification",
			notifiable_type: this.morph,
			notifiable_id: this.keyOf(user),
			data: JSON.stringify(data),
			read_at: null,
			created_at: stamp,
			updated_at: stamp,
		}));
		await this.db.insertInto(this.table).values(rows).execute();
	}
}

function decode(row: NotificationRow): StoredNotification {
	let data: StoredNotification["data"] = {};
	try {
		const parsed: unknown = JSON.parse(row.data);
		data =
			parsed !== null && typeof parsed === "object"
				? (parsed as StoredNotification["data"])
				: {};
	} catch {
		data = {};
	}
	return {
		id: row.id,
		data,
		readAt: parse(row.read_at),
		createdAt: parse(row.created_at) ?? new Date(0),
	};
}
