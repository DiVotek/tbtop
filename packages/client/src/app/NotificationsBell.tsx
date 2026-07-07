import { BellIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Badge } from "../ui/badge";
import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	ResponsiveDialogContent,
	ResponsiveDialogTrigger,
} from "../ui/revola";
import { useChromeData } from "./chromeContext";
import { NotificationsPanel } from "./NotificationsPanel";
import { useNotifications } from "./useNotifications";

/**
 * Header notifications bell (chrome block kind `notifications`). Polls the
 * panel's interval for the unread count and opens a right-edge slide-over
 * with the full list. Enablement is presence: the bell only appears where
 * the chrome tree places it.
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
		<ResponsiveDialog
			onlyDrawer
			direction="right"
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					void refresh();
				}
			}}
		>
			<ResponsiveDialogTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className="relative flex size-8 items-center justify-center rounded-md hover:bg-accent"
					data-testid="notifications-trigger"
				>
					<BellIcon className="size-4" aria-hidden />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							aria-hidden
							className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
							data-testid="notifications-badge"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</button>
			</ResponsiveDialogTrigger>
			<ResponsiveDialogContent
				showCloseButton={false}
				className="ml-auto flex h-full w-[min(24rem,100vw)] flex-col p-0"
				data-testid="notifications-popover"
			>
				<NotificationsPanel
					items={items}
					loading={loading}
					error={error}
					onMarkRead={markRead}
					onDelete={remove}
					onClearAll={clearAll}
					closeSlot={
						<ResponsiveDialogClose asChild>
							<button
								type="button"
								className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
								data-testid="notifications-close"
							>
								{t("notifications.close")}
							</button>
						</ResponsiveDialogClose>
					}
				/>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
