import { router } from "@inertiajs/react";
import { UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutPath as panelLogoutPath } from "../data/entityRoutes";
import { useLocale, useTranslation } from "../i18n/i18n";
import { isExternalUrl } from "../structure/actionBlock";
import { NodeIcon } from "../ui/node-icon";
import { useChromeData } from "./chromeContext";

function openUserMenuItem(href: string, newTab?: boolean): void {
	if (newTab) {
		window.open(href, "_blank", "noopener");
		return;
	}
	if (isExternalUrl(href)) {
		window.location.assign(href);
		return;
	}
	router.visit(href);
}

interface ProfileDropdownUser {
	name?: string;
	email?: string;
}

interface ProfileDropdownProps {
	user: ProfileDropdownUser | null;
	logoutPath?: string;
	/** Hide the built-in language section (panel offers it elsewhere). */
	showLocales?: boolean;
}

// Defaulting to the panel-prefixed path (not a bare "/logout"): the logout
// endpoint is registered under the admin prefix, and an unprefixed POST falls
// through to the host app's own routes.
export function ProfileDropdown({
	user,
	logoutPath = panelLogoutPath(),
	showLocales = true,
}: ProfileDropdownProps) {
	const t = useTranslation();
	const { locale, setLocale, available: availableLocales } = useLocale();
	const { userMenuItems = [] } = useChromeData();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	if (!user) {
		return null;
	}

	const displayName = resolveDisplayName(user);
	const initials = getInitials(displayName);

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				className="flex h-8 items-center gap-1.5 rounded-full border bg-background pl-1.5 pr-3 text-sm hover:bg-accent"
				onClick={() => setOpen((prev) => !prev)}
				data-testid="profile-trigger"
			>
				<span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
					{initials || <UserIcon className="size-4" />}
				</span>
				<span data-testid="profile-name">{displayName}</span>
			</button>

			{open && (
				<div
					className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-md border bg-popover p-1 shadow-md"
					data-testid="profile-menu"
				>
					<div className="border-b pb-1 mb-1">
						<div className="px-3 py-1.5 text-xs text-muted-foreground">
							{t("auth.profile.title")}
						</div>
						<div className="px-3 py-1 text-sm font-medium">{displayName}</div>
					</div>

					{userMenuItems.length > 0 && (
						<div className="border-b pb-1 mb-1">
							{userMenuItems.map((item) => (
								<button
									key={item.href}
									type="button"
									className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
									data-testid={`user-menu-item-${item.href}`}
									onClick={() => openUserMenuItem(item.href, item.newTab)}
								>
									<NodeIcon icon={item.icon} className="size-4 shrink-0" />
									<span className="flex-1 text-left truncate">{item.label}</span>
								</button>
							))}
						</div>
					)}

					{showLocales && availableLocales.length >= 2 && (
						<div className="border-b pb-1 mb-1">
							<div className="px-3 py-1.5 text-xs text-muted-foreground">
								{t("nav.language")}
							</div>
							{availableLocales.map((code) => (
								<button
									key={code}
									type="button"
									className="flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-sm hover:bg-accent data-[active=true]:font-medium"
									data-active={locale === code}
									data-testid={`locale-option-${code}`}
									onClick={() => setLocale(code)}
								>
									<span className="uppercase text-xs">{code}</span>
								</button>
							))}
						</div>
					)}

					<button
						type="button"
						className="flex w-full items-center rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
						onClick={() => router.post(logoutPath)}
						data-testid="profile-logout"
					>
						{t("action.logout")}
					</button>
				</div>
			)}
		</div>
	);
}

/** Prefer the profile name; fall back to the email's local part (before @). */
function resolveDisplayName(user: ProfileDropdownUser): string {
	const name = user.name?.trim();
	if (name) {
		return name;
	}
	return user.email?.split("@")[0] ?? "";
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
	}
	return name.slice(0, 2).toUpperCase();
}
