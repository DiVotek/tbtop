import { HttpError, json } from "../server/http";
import type { NotificationStore, StoredNotification } from "./store";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * The bell's API under `{prefix}/api/notifications` (NotificationsController):
 * list with the unread count, mark one read, delete one, delete all. Every
 * call is scoped to the signed-in user; without one there is nothing to show.
 */
export async function notificationsRoute(
	store: NotificationStore,
	request: Request,
	{ path, user }: { path: string; user: unknown },
): Promise<Response | null> {
	const [, , id, verb] = path.split("/");
	if (user == null) {
		throw new HttpError(404, "No authenticated notifiable user.");
	}
	if (request.method === "GET" && id === undefined) {
		return index(store, user, new URL(request.url).searchParams.get("limit"));
	}
	if (request.method === "DELETE") {
		return id === undefined
			? noContent(await store.deleteAll(user))
			: owned(await store.delete(user, id));
	}
	if (request.method === "POST" && id !== undefined && verb === "read") {
		return owned(await store.markRead(user, id));
	}
	return null;
}

async function index(store: NotificationStore, user: unknown, raw: string | null) {
	// A non-numeric limit means "not given", not 0.
	const limit =
		raw !== null && /^\d+$/.test(raw)
			? Math.max(1, Math.min(MAX_LIMIT, Number(raw)))
			: DEFAULT_LIMIT;
	const [rows, unreadCount] = await Promise.all([
		store.list(user, limit),
		store.unreadCount(user),
	]);
	return json({ data: rows.map(project), unreadCount });
}

const noContent = (_?: unknown) => new Response(null, { status: 204 });

function owned(found: boolean): Response {
	if (!found) {
		throw new HttpError(404, "Notification not found.");
	}
	return noContent();
}

/** NotificationProjection::item(): never trusts a key's presence or type. */
export function project(row: StoredNotification) {
	const data = row.data ?? {};
	const optional = (value: unknown) =>
		value === undefined || value === null ? null : text(value);
	return {
		id: text(row.id),
		title: text(data.title),
		body: optional(data.body),
		icon: optional(data.icon),
		color: optional(data.color),
		actions: actions(data.actions),
		readAt: iso(row.readAt),
		createdAt: iso(row.createdAt),
	};
}

function text(value: unknown): string {
	return ["string", "number", "boolean"].includes(typeof value) ? String(value) : "";
}

function iso(value: Date | string | null | undefined): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function actions(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.flatMap((action: Record<string, unknown> | null) => {
		if (action === null || typeof action !== "object") {
			return [];
		}
		const link = { label: text(action.label), url: text(action.url) };
		return action.newTab === true ? [{ ...link, newTab: true }] : [link];
	});
}
