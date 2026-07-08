import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { Spinner } from "../ui/spinner";
import { NotificationItem } from "./NotificationItem";
import type { AdminNotification } from "./useNotifications";

interface NotificationsPanelProps {
	items: AdminNotification[];
	loading: boolean;
	error: boolean;
	onMarkRead: (id: string) => void;
	onDelete: (id: string) => void;
	onClearAll: () => void;
	/** Optional close control (e.g. the slide-over's dismiss button). */
	closeSlot?: ReactNode;
}

export function NotificationsPanel({
	items,
	loading,
	error,
	onMarkRead,
	onDelete,
	onClearAll,
	closeSlot,
}: NotificationsPanelProps) {
	const t = useTranslation();
	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
				<span className="text-sm font-semibold">{t("notifications.title")}</span>
				<div className="flex items-center gap-4">
					<button
						type="button"
						disabled={items.length === 0}
						onClick={onClearAll}
						className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
						data-testid="notifications-clear-all"
					>
						{t("notifications.clear_all")}
					</button>
					{closeSlot}
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto" data-testid="notifications-list">
				{renderBody({ items, loading, error, onMarkRead, onDelete, t })}
			</div>
		</div>
	);
}

interface BodyProps {
	items: AdminNotification[];
	loading: boolean;
	error: boolean;
	onMarkRead: (id: string) => void;
	onDelete: (id: string) => void;
	t: (key: string) => string;
}

function renderBody({ items, loading, error, onMarkRead, onDelete, t }: BodyProps): ReactNode {
	if (items.length === 0 && loading) {
		return (
			<div
				className="flex items-center justify-center py-10"
				data-testid="notifications-loading"
			>
				<Spinner />
			</div>
		);
	}
	if (items.length === 0) {
		return (
			<div className="px-4 py-10 text-center" data-testid="notifications-empty">
				<p className="text-sm font-medium">
					{t(error ? "notifications.error" : "notifications.empty")}
				</p>
				{!error && (
					<p className="mt-1 text-xs text-muted-foreground">
						{t("notifications.empty_hint")}
					</p>
				)}
			</div>
		);
	}
	return (
		<ul>
			{items.map((notification) => (
				<NotificationItem
					key={notification.id}
					notification={notification}
					onMarkRead={onMarkRead}
					onDelete={onDelete}
				/>
			))}
		</ul>
	);
}
