import { router } from "@inertiajs/react";
import { UserIcon } from "lucide-react";
import { logoutPath as panelLogoutPath } from "../data/entityRoutes";
import { useLocale, useTranslation } from "../i18n/i18n";
import { isExternalUrl } from "../structure/actionBlock";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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

	if (!user) {
		return null;
	}

	const displayName = resolveDisplayName(user);
	const initials = getInitials(displayName);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="flex h-8 items-center gap-1.5 rounded-full border bg-background pl-1.5 pr-3 text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
				data-testid="profile-trigger"
			>
				<span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
					{initials || <UserIcon className="size-3" />}
				</span>
				<span data-testid="profile-name">{displayName}</span>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="min-w-48" data-testid="profile-menu">
				<DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
					{t("auth.profile.title")}
				</DropdownMenuLabel>
				<DropdownMenuLabel>{displayName}</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{userMenuItems.length > 0 && (
					<>
						{userMenuItems.map((item) => (
							<DropdownMenuItem
								key={item.href}
								data-testid={`user-menu-item-${item.href}`}
								onSelect={() => openUserMenuItem(item.href, item.newTab)}
							>
								<NodeIcon icon={item.icon} className="size-4 shrink-0" />
								<span className="flex-1 truncate">{item.label}</span>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
					</>
				)}

				{showLocales && availableLocales.length >= 2 && (
					<>
						<DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
							{t("nav.language")}
						</DropdownMenuLabel>
						{availableLocales.map((code) => (
							<DropdownMenuItem
								key={code}
								data-active={locale === code}
								className="data-[active=true]:font-medium"
								data-testid={`locale-option-${code}`}
								onSelect={() => setLocale(code)}
							>
								<span className="uppercase text-xs">{code}</span>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
					</>
				)}

				<DropdownMenuItem
					onSelect={() => router.post(logoutPath)}
					data-testid="profile-logout"
				>
					{t("action.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
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
