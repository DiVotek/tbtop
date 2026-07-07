import { router } from "@inertiajs/react";
import { MonitorIcon, MoonIcon, SunIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { isExternalUrl } from "../structure/actionBlock";
import { NodeIcon } from "../ui/node-icon";
import { useChromeData } from "./chromeContext";
import { applyTheme, readThemeCookie, THEMES, type Theme, writeThemeCookie } from "./theme";

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
}

const THEME_ICONS: Record<Theme, React.ReactNode> = {
	light: <SunIcon className="size-4" />,
	dark: <MoonIcon className="size-4" />,
	system: <MonitorIcon className="size-4" />,
};

export function ProfileDropdown({ user, logoutPath = "/logout" }: ProfileDropdownProps) {
	const t = useTranslation();
	const { locale, setLocale, available: availableLocales } = useLocale();
	const { darkMode = true, defaultTheme = "system", userMenuItems = [] } = useChromeData();
	const [open, setOpen] = useState(false);
	const [theme, setThemeState] = useState<Theme>(() => readThemeCookie(defaultTheme));
	const containerRef = useRef<HTMLDivElement>(null);

	const setTheme = useCallback(
		(next: Theme) => {
			setThemeState(next);
			writeThemeCookie(next);
			applyTheme(next, darkMode);
		},
		[darkMode],
	);

	useEffect(() => {
		applyTheme(theme, darkMode);
	}, [theme, darkMode]);

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

	const displayName = user.name ?? user.email ?? "";
	const initials = getInitials(displayName);

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
				onClick={() => setOpen((prev) => !prev)}
				data-testid="profile-trigger"
			>
				<span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
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

					{darkMode && (
						<div className="border-b pb-1 mb-1">
							<div className="px-3 py-1.5 text-xs text-muted-foreground">
								{t("nav.title")}
							</div>
							{THEMES.map((th) => (
								<button
									key={th}
									type="button"
									className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent data-[active=true]:font-medium"
									data-active={theme === th}
									data-testid={`theme-option-${th}`}
									onClick={() => setTheme(th)}
								>
									{THEME_ICONS[th]}
									<span className="capitalize">{th}</span>
								</button>
							))}
						</div>
					)}

					{availableLocales.length >= 2 && (
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

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
	}
	return name.slice(0, 2).toUpperCase();
}
