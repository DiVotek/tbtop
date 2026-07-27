import { router } from "@inertiajs/react";
import {
	AlertTriangleIcon,
	BellIcon,
	CheckCircle2Icon,
	InfoIcon,
	type LucideIcon,
	XCircleIcon,
	XIcon,
} from "lucide-react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { relativeTime } from "../lib/relativeTime";
import { isExternalUrl } from "../structure/actionBlock";
import { resolveColorClasses } from "../structure/table/colorRegistry";
import { NodeIcon } from "../ui/node-icon";
import type { AdminNotification, NotificationActionLink } from "./useNotifications";

const STATUS_ICON: Record<string, LucideIcon> = {
	success: CheckCircle2Icon,
	warning: AlertTriangleIcon,
	danger: XCircleIcon,
	destructive: XCircleIcon,
	info: InfoIcon,
};

interface NotificationItemProps {
	notification: AdminNotification;
	onMarkRead: (id: string) => void;
	onDelete: (id: string) => void;
}

function openAction(action: NotificationActionLink): void {
	if (action.newTab) {
		window.open(action.url, "_blank", "noopener,noreferrer");
		return;
	}
	if (isExternalUrl(action.url)) {
		window.location.href = action.url;
		return;
	}
	router.visit(action.url);
}

export function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
	const t = useTranslation();
	const { locale } = useLocale();
	const unread = notification.readAt === null;
	const tint = resolveColorClasses(notification.color ?? undefined);
	const Fallback = STATUS_ICON[notification.color ?? ""] ?? BellIcon;
	const actions = notification.actions;

	return (
		<li
			className="group relative border-b last:border-b-0"
			data-testid="notification-item"
			data-unread={unread}
		>
			<button
				type="button"
				onClick={() => onMarkRead(notification.id)}
				className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent data-[unread=true]:bg-accent/40"
				data-unread={unread}
			>
				<span
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-full",
						tint.bg,
						tint.text,
					)}
				>
					{notification.icon ? (
						<NodeIcon icon={{ name: notification.icon }} className="size-4" />
					) : (
						<Fallback className="size-4" aria-hidden />
					)}
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex items-start gap-2">
						<span className="min-w-0 flex-1 pr-5 text-sm font-medium">
							{notification.title}
						</span>
						{unread && (
							<span
								className="mt-1 size-2 shrink-0 rounded-full bg-primary transition-opacity group-hover:opacity-0"
								aria-hidden
							/>
						)}
					</span>
					{notification.body && (
						<span className="mt-0.5 block line-clamp-2 text-sm text-muted-foreground">
							{notification.body}
						</span>
					)}
					<time
						dateTime={notification.createdAt}
						className="mt-1 block text-xs text-muted-foreground"
					>
						{relativeTime(notification.createdAt, locale)}
					</time>
				</span>
			</button>
			<button
				type="button"
				onClick={() => onDelete(notification.id)}
				aria-label={t("notifications.delete")}
				className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100"
				data-testid="notification-delete"
			>
				<XIcon className="size-4" aria-hidden />
			</button>
			{actions.length > 0 && (
				<div className="flex flex-wrap gap-3 pb-3 pl-15 pr-4">
					{actions.map((action) => (
						<button
							key={`${action.label}:${action.url}`}
							type="button"
							onClick={() => {
								onMarkRead(notification.id);
								openAction(action);
							}}
							className="text-xs font-medium text-primary hover:underline"
							data-testid="notification-action"
						>
							{action.label}
						</button>
					))}
				</div>
			)}
		</li>
	);
}
