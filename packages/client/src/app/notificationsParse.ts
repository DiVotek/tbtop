export interface NotificationActionLink {
	label: string;
	url: string;
	newTab?: boolean;
}

export interface AdminNotification {
	id: string;
	title: string;
	body: string | null;
	icon: string | null;
	color: string | null;
	actions: NotificationActionLink[];
	readAt: string | null;
	createdAt: string;
}

export interface NotificationList {
	items: AdminNotification[];
	unreadCount: number;
}

/**
 * Narrow the bell endpoint's JSON into typed notifications without a runtime
 * schema dependency (the client ships zod-free). Defensive per field — a
 * legacy or foreign `data` row may be partial — returning null only when the
 * envelope itself is not an object.
 */
export function parseNotificationList(value: unknown): NotificationList | null {
	if (!isObject(value)) {
		return null;
	}
	const data = Array.isArray(value.data) ? value.data : [];
	const items = parseItems(data);
	const count = value.unreadCount;
	return { items, unreadCount: typeof count === "number" ? count : 0 };
}

function parseItems(raw: unknown[]): AdminNotification[] {
	const out: AdminNotification[] = [];
	for (const value of raw) {
		const item = parseNotification(value);
		if (item !== null) {
			out.push(item);
		}
	}
	return out;
}

function parseNotification(value: unknown): AdminNotification | null {
	if (!isObject(value) || typeof value.id !== "string") {
		return null;
	}
	return {
		id: value.id,
		title: typeof value.title === "string" ? value.title : "",
		body: optionalString(value, "body"),
		icon: optionalString(value, "icon"),
		color: optionalString(value, "color"),
		actions: parseActions(value.actions),
		readAt: optionalString(value, "readAt"),
		createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
	};
}

function parseActions(value: unknown): NotificationActionLink[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: NotificationActionLink[] = [];
	for (const item of value) {
		if (!isObject(item) || typeof item.label !== "string" || typeof item.url !== "string") {
			continue;
		}
		const action: NotificationActionLink = { label: item.label, url: item.url };
		if (item.newTab === true) {
			action.newTab = true;
		}
		out.push(action);
	}
	return out;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function optionalString(obj: Record<string, unknown>, key: string): string | null {
	const value = obj[key];
	return typeof value === "string" ? value : null;
}
