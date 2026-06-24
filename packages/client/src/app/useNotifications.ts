import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiBase, useClient } from "../data/client";
import { useTranslation } from "../i18n/i18n";
import { usePolling } from "../lib/usePolling";
import { type AdminNotification, parseNotificationList } from "./notificationsParse";

export type { AdminNotification, NotificationActionLink } from "./notificationsParse";

export interface UseNotifications {
	items: AdminNotification[];
	unreadCount: number;
	loading: boolean;
	error: boolean;
	refresh: () => Promise<void>;
	markRead: (id: string) => Promise<void>;
	remove: (id: string) => Promise<void>;
	clearAll: () => Promise<void>;
}

const nowIso = (): string => new Date().toISOString();

// oxlint-disable-next-line max-lines-per-function -- hook: state + the optimistic mutations stay inline (hook rules)
export function useNotifications(pollInterval: number | null | undefined): UseNotifications {
	const client = useClient();
	const base = `${useApiBase()}/notifications`;
	const t = useTranslation();
	const [items, setItems] = useState<AdminNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const refresh = useCallback(async () => {
		try {
			const parsed = parseNotificationList(await client.get(base));
			if (parsed === null) {
				setError(true);
				return;
			}
			setItems(parsed.items);
			setUnreadCount(parsed.unreadCount);
			setError(false);
		} catch {
			setError(true);
		} finally {
			setLoading(false);
		}
	}, [client, base]);

	useEffect(() => {
		void refresh();
	}, [refresh]);
	usePolling(refresh, pollInterval);

	// Optimistic: apply next state, send, roll back + toast on failure.
	const mutate = useCallback(
		async (nextItems: AdminNotification[], nextCount: number, send: () => Promise<unknown>) => {
			const prevItems = items;
			const prevCount = unreadCount;
			setItems(nextItems);
			setUnreadCount(nextCount);
			try {
				await send();
			} catch {
				setItems(prevItems);
				setUnreadCount(prevCount);
				toast.error(t("notifications.action_failed"));
			}
		},
		[items, unreadCount, t],
	);

	const markRead = useCallback(
		(id: string) => {
			const target = items.find((n) => n.id === id);
			if (target === undefined || target.readAt !== null) {
				return Promise.resolve();
			}
			const next = items.map((n) => (n.id === id ? { ...n, readAt: nowIso() } : n));
			return mutate(next, Math.max(0, unreadCount - 1), () =>
				client.post(`${base}/${id}/read`),
			);
		},
		[items, unreadCount, mutate, client, base],
	);

	const remove = useCallback(
		(id: string) => {
			const target = items.find((n) => n.id === id);
			if (target === undefined) {
				return Promise.resolve();
			}
			const count = target.readAt === null ? Math.max(0, unreadCount - 1) : unreadCount;
			return mutate(
				items.filter((n) => n.id !== id),
				count,
				() => client.delete(`${base}/${id}`),
			);
		},
		[items, unreadCount, mutate, client, base],
	);

	const clearAll = useCallback(() => {
		if (items.length === 0) {
			return Promise.resolve();
		}
		return mutate([], 0, () => client.delete(base));
	}, [items, mutate, client, base]);

	return { items, unreadCount, loading, error, refresh, markRead, remove, clearAll };
}
