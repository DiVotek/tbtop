import { BellIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useChromeData } from "./chromeContext";
import { NotificationsPanel } from "./NotificationsPanel";
import { useNotifications } from "./useNotifications";

/**
 * Header notifications bell (chrome block kind `notifications`). Polls the
 * panel's interval for the unread count, opens a popover with the list, and
 * marks/deletes notifications. Enablement is presence: the bell only appears
 * where the chrome tree places it.
 */
export function NotificationsBell() {
	const t = useTranslation();
	const { notificationsPollInterval } = useChromeData();
	const [open, setOpen] = useState(false);
	const { items, unreadCount, loading, error, refresh, markRead, remove, clearAll } =
		useNotifications(notificationsPollInterval);

	const ariaLabel =
		unreadCount > 0
			? t("notifications.aria_unread").replace("{count}", String(unreadCount))
			: t("notifications.aria");

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					void refresh();
				}
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className="relative flex size-9 items-center justify-center rounded-md hover:bg-accent"
					data-testid="notifications-trigger"
				>
					<BellIcon className="size-5" aria-hidden />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							aria-hidden
							className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
							data-testid="notifications-badge"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[min(22rem,calc(100vw-2rem))] p-0"
				data-testid="notifications-popover"
			>
				<NotificationsPanel
					items={items}
					loading={loading}
					error={error}
					onMarkRead={markRead}
					onDelete={remove}
					onClearAll={clearAll}
				/>
			</PopoverContent>
		</Popover>
	);
}
