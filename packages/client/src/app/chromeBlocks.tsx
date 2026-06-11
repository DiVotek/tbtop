import { Link } from "@inertiajs/react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { type ChromeData, type NavGroup, useChromeData } from "./chromeContext";
import { ProfileDropdown } from "./ProfileDropdown";

// The predefined chrome block kinds (navMenu / userMenu / logo /
// localeSwitcher / spacer). Option-less on the wire — all data flows
// from ChromeDataContext, so the server-authored chrome trees and the
// legacy shell defaults render through the same components.

export function NavMenuBlock() {
	const { nav, currentUrl } = useChromeData();
	return (
		<nav className="flex flex-col gap-4" data-testid="admin-sidebar">
			{nav.map((group) => (
				<NavGroupSection key={group.group} group={group} currentUrl={currentUrl} />
			))}
		</nav>
	);
}

export function UserMenuBlock() {
	const { user } = useChromeData();
	return <ProfileDropdown user={user} />;
}

export function LogoBlock() {
	const t = useTranslation();
	const { brand, logoSlot } = useChromeData();
	return <div className="text-lg font-semibold">{logoSlot ?? brand ?? t("nav.title")}</div>;
}

export function LocaleSwitcherBlock() {
	const { locale, setLocale, available } = useLocale();
	if (available.length < 2) {
		return null;
	}
	return (
		<div className="flex items-center gap-1" data-testid="locale-switcher">
			{available.map((code) => (
				<button
					key={code}
					type="button"
					className="rounded-md px-2 py-1 text-xs uppercase hover:bg-accent data-[active=true]:bg-accent data-[active=true]:font-medium"
					data-active={locale === code}
					data-testid={`locale-switcher-${code}`}
					onClick={() => setLocale(code)}
				>
					{code}
				</button>
			))}
		</div>
	);
}

export function SpacerBlock() {
	return <div className="flex-1" data-testid="chrome-spacer" />;
}

interface NavGroupSectionProps {
	group: NavGroup;
	currentUrl: ChromeData["currentUrl"];
}

function NavGroupSection({ group, currentUrl }: NavGroupSectionProps) {
	return (
		<div className="flex flex-col gap-1">
			<div className="px-2 text-xs font-medium uppercase text-muted-foreground">
				{group.group}
			</div>
			{group.items.map((item) => (
				<Link
					key={item.href}
					href={item.href}
					className={`rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
						currentUrl.startsWith(item.href) ? "bg-accent font-medium" : ""
					}`}
				>
					{item.label}
				</Link>
			))}
		</div>
	);
}
