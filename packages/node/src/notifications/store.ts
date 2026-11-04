import type { NotificationData } from "./notification";

/** One stored notification: Laravel's `notifications` row, decoded. */
export interface StoredNotification {
	id: string;
	data: Partial<NotificationData> & Record<string, unknown>;
	readAt: Date | string | null;
	createdAt: Date | string;
}

/** Where the bell's notifications live; every call is scoped to one user. */
export interface NotificationStore {
	/** Newest first. */
	list(user: unknown, limit: number): Promise<StoredNotification[]>;
	unreadCount(user: unknown): Promise<number>;
	/** False when the user owns no such notification. */
	markRead(user: unknown, id: string): Promise<boolean>;
	delete(user: unknown, id: string): Promise<boolean>;
	deleteAll(user: unknown): Promise<void>;
	send(users: unknown[], data: NotificationData): Promise<void>;
}

type Row = StoredNotification & { owner: string };

/** In-process store for tests and demos; `keyOf` names the user (default `user.id`). */
export function memoryNotifications(
	keyOf: (user: unknown) => string = (user) => String((user as { id?: unknown }).id),
): NotificationStore & { rows: Row[] } {
	const rows: Row[] = [];
	const own = (user: unknown) => rows.filter((row) => row.owner === keyOf(user));
	const find = (user: unknown, id: string) => own(user).find((row) => row.id === id);
	return {
		rows,
		list: async (user, limit) => own(user).toReversed().slice(0, limit),
		unreadCount: async (user) => own(user).filter((row) => row.readAt === null).length,
		markRead: async (user, id) => {
			const row = find(user, id);
			if (row !== undefined) {
				row.readAt ??= new Date();
			}
			return row !== undefined;
		},
		delete: async (user, id) => {
			const row = find(user, id);
			if (row !== undefined) {
				rows.splice(rows.indexOf(row), 1);
			}
			return row !== undefined;
		},
		deleteAll: async (user) => {
			for (const row of own(user)) {
				rows.splice(rows.indexOf(row), 1);
			}
		},
		send: async (users, data) => {
			for (const user of users) {
				rows.push({
					id: crypto.randomUUID(),
					owner: keyOf(user),
					data,
					readAt: null,
					createdAt: new Date(),
				});
			}
		},
	};
}
