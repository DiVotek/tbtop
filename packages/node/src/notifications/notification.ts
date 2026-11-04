import type { NotificationStore } from "./store";

/** A link on a notification (NotificationAction.php): links only, never a server closure. */
export class NotificationAction {
	private href = "";
	private newTab = false;

	private constructor(private readonly label: string) {}

	static make(label: string): NotificationAction {
		return new NotificationAction(label);
	}

	url(url: string): this {
		this.href = url;
		return this;
	}

	openUrlInNewTab(condition = true): this {
		this.newTab = condition;
		return this;
	}

	toArray(): { label: string; url: string; newTab?: true } {
		return this.newTab
			? { label: this.label, url: this.href, newTab: true }
			: { label: this.label, url: this.href };
	}

	toJSON() {
		return this.toArray();
	}
}

export type NotificationData = {
	title: string;
	body?: string;
	icon?: string;
	color?: string;
	actions?: ReturnType<NotificationAction["toArray"]>[];
};

/**
 * A database notification for the header bell (Notification.php). This owns
 * only the payload; the store decides where it lives.
 *
 *     await Notification.make().title("Booking confirmed").success()
 *         .actions([NotificationAction.make("View").url("/admin/bookings/42")])
 *         .sendTo(store, [admin]);
 */
export class Notification {
	private data: NotificationData = { title: "" };
	private links: NotificationAction[] = [];

	static make(): Notification {
		return new Notification();
	}

	/** The only field always present on the payload. */
	title(title: string): this {
		this.data.title = title;
		return this;
	}

	body(body: string): this {
		this.data.body = body;
		return this;
	}

	/** Lucide icon name (client icon registry); overrides the status default. */
	icon(icon: string): this {
		this.data.icon = icon;
		return this;
	}

	/** success / warning / danger / info, or a registered custom color. */
	color(color: string): this {
		this.data.color = color;
		return this;
	}

	status(status: string): this {
		return this.color(status);
	}

	success(): this {
		return this.status("success");
	}

	warning(): this {
		return this.status("warning");
	}

	danger(): this {
		return this.status("danger");
	}

	info(): this {
		return this.status("info");
	}

	actions(actions: NotificationAction[]): this {
		this.links = actions;
		return this;
	}

	/** The stored payload, sparse: only `title` is always present. */
	toArray(): NotificationData {
		return this.links.length === 0
			? { ...this.data }
			: { ...this.data, actions: this.links.map((a) => a.toArray()) };
	}

	/** sendToDatabase(): one row per user, now. */
	sendTo(store: NotificationStore, users: unknown[]): Promise<void> {
		return store.send(users, this.toArray());
	}
}
