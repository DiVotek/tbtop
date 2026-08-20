import { useCallback, useEffect, useRef, useState } from "react";
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
	const stateRef = useRef({ items, unreadCount });
	const mutationQueue = useRef<Promise<void>>(Promise.resolve());

	const setNotificationState = useCallback(
		(nextItems: AdminNotification[], nextCount: number) => {
			stateRef.current = { items: nextItems, unreadCount: nextCount };
			setItems(nextItems);
			setUnreadCount(nextCount);
		},
		[],
	);

	const refresh = useCallback(async () => {
		try {
			const parsed = parseNotificationList(await client.get(base));
			if (parsed === null) {
				setError(true);
				return;
			}
			setNotificationState(parsed.items, parsed.unreadCount);
			setError(false);
		} catch {
			setError(true);
		} finally {
			setLoading(false);
		}
	}, [client, base, setNotificationState]);

	useEffect(() => {
		void refresh();
	}, [refresh]);
	usePolling(refresh, pollInterval);

	// Optimistic: apply next state, send, roll back + toast on failure.
	const mutate = useCallback(
		(
			update: (current: typeof stateRef.current) => typeof stateRef.current,
			send: () => Promise<unknown>,
		) => {
			const operation = mutationQueue.current.then(async () => {
				const previous = stateRef.current;
				const next = update(previous);
				setNotificationState(next.items, next.unreadCount);
				try {
					await send();
				} catch {
					setNotificationState(previous.items, previous.unreadCount);
					toast.error(t("notifications.action_failed"));
				}
			});
			mutationQueue.current = operation;
			return operation;
		},
		[setNotificationState, t],
	);

	const markRead = useCallback(
		(id: string) => {
			return mutate(
				(current) => {
					const target = current.items.find((n) => n.id === id);
					if (target === undefined || target.readAt !== null) {
						return current;
					}
					return {
						items: current.items.map((n) =>
							n.id === id ? { ...n, readAt: nowIso() } : n,
						),
						unreadCount: Math.max(0, current.unreadCount - 1),
					};
				},
				() => client.post(`${base}/${id}/read`),
			);
		},
		[mutate, client, base],
	);

	const remove = useCallback(
		(id: string) => {
			return mutate(
				(current) => {
					const target = current.items.find((n) => n.id === id);
					if (target === undefined) {
						return current;
					}
					return {
						items: current.items.filter((n) => n.id !== id),
						unreadCount:
							target.readAt === null
								? Math.max(0, current.unreadCount - 1)
								: current.unreadCount,
					};
				},
				() => client.delete(`${base}/${id}`),
			);
		},
		[mutate, client, base],
	);

	const clearAll = useCallback(() => {
		if (items.length === 0) {
			return Promise.resolve();
		}
		return mutate(
			() => ({ items: [], unreadCount: 0 }),
			() => client.delete(base),
		);
	}, [items, mutate, client, base]);

	return { items, unreadCount, loading, error, refresh, markRead, remove, clearAll };
}
