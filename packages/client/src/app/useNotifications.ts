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
const unread = (items: AdminNotification[]): number =>
	items.reduce((count, item) => count + (item.readAt === null ? 1 : 0), 0);

// oxlint-disable-next-line max-lines-per-function -- hook: state + the optimistic mutations stay inline (hook rules)
export function useNotifications(pollInterval: number | null | undefined): UseNotifications {
	const client = useClient();
	const base = `${useApiBase()}/notifications`;
	const t = useTranslation();
	const [items, setItems] = useState<AdminNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const itemsRef = useRef(items);
	const mutationSequence = useRef(0);
	const latestMutation = useRef(new Map<string, number>());

	const updateItems = useCallback((next: AdminNotification[]) => {
		itemsRef.current = next;
		setItems(next);
		setUnreadCount(unread(next));
	}, []);

	const refresh = useCallback(async () => {
		try {
			const parsed = parseNotificationList(await client.get(base));
			if (parsed === null) {
				setError(true);
				return;
			}
			itemsRef.current = parsed.items;
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

	const markRead = useCallback(
		async (id: string) => {
			const target = itemsRef.current.find((n) => n.id === id);
			if (target === undefined || target.readAt !== null) {
				return;
			}
			const operation = ++mutationSequence.current;
			latestMutation.current.set(id, operation);
			updateItems(
				itemsRef.current.map((item) =>
					item.id === id ? { ...item, readAt: nowIso() } : item,
				),
			);
			try {
				await client.post(`${base}/${id}/read`);
			} catch {
				if (latestMutation.current.get(id) === operation) {
					updateItems(
						itemsRef.current.map((item) =>
							item.id === id ? { ...item, readAt: target.readAt } : item,
						),
					);
				}
				toast.error(t("notifications.action_failed"));
			}
		},
		[client, base, t, updateItems],
	);

	const remove = useCallback(
		async (id: string) => {
			const previous = itemsRef.current;
			const target = previous.find((n) => n.id === id);
			if (target === undefined) {
				return;
			}
			const operation = ++mutationSequence.current;
			latestMutation.current.set(id, operation);
			updateItems(previous.filter((item) => item.id !== id));
			try {
				await client.delete(`${base}/${id}`);
			} catch {
				if (latestMutation.current.get(id) === operation) {
					const index = previous.indexOf(target);
					const next = [...itemsRef.current];
					next.splice(Math.min(index, next.length), 0, target);
					updateItems(next);
				}
				toast.error(t("notifications.action_failed"));
			}
		},
		[client, base, t, updateItems],
	);

	const clearAll = useCallback(async () => {
		const previous = itemsRef.current;
		if (previous.length === 0) {
			return;
		}
		const operation = ++mutationSequence.current;
		for (const item of previous) {
			latestMutation.current.set(item.id, operation);
		}
		updateItems([]);
		try {
			await client.delete(base);
		} catch {
			const restorable = previous.filter(
				(item) => latestMutation.current.get(item.id) === operation,
			);
			const restoredIds = new Set(restorable.map((item) => item.id));
			updateItems([
				...restorable,
				...itemsRef.current.filter((item) => !restoredIds.has(item.id)),
			]);
			toast.error(t("notifications.action_failed"));
		}
	}, [client, base, t, updateItems]);

	return { items, unreadCount, loading, error, refresh, markRead, remove, clearAll };
}
