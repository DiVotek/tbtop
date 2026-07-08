import { useLocale, useTranslation } from "../i18n/i18n";
import { useChromeData } from "./chromeContext";
import { NavGroupDropdown } from "./navGroupDropdown";
import { NavGroupSection } from "./navGroupSection";
import { ProfileDropdown } from "./ProfileDropdown";

// The predefined chrome block kinds (navMenu / userMenu / logo /
// localeSwitcher / spacer). Option-less on the wire — all data flows
// from ChromeDataContext, so the server-authored chrome trees and the
// legacy shell defaults render through the same components.

export function NavMenuBlock() {
	const { nav, currentUrl, orientation } = useChromeData();
	// Topbar: each group is an inline dropdown. The mobile drawer reuses this
	// block under a "vertical" override, so it still renders the stacked tree.
	if (orientation === "horizontal") {
		return (
			<nav className="flex flex-row items-center gap-1" data-testid="admin-sidebar">
				{nav.map((group) => (
					<NavGroupDropdown key={group.group} group={group} currentUrl={currentUrl} />
				))}
			</nav>
		);
	}
	// Rail (collapsed sidebar): a vertical strip of group icons, each opening
	// its items in a dropdown to the right.
	if (orientation === "rail") {
		return (
			<nav className="flex flex-col items-center gap-1" data-testid="admin-sidebar">
				{nav.map((group) => (
					<NavGroupDropdown
						key={group.group}
						group={group}
						currentUrl={currentUrl}
						rail
					/>
				))}
			</nav>
		);
	}
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
	if (available.length === 0) {
		return null;
	}
	return (
		<div className="flex items-center gap-1" data-testid="locale-switcher">
			{available.map((code) => (
				<button
					key={code}
					type="button"
					className="flex size-8 items-center justify-center rounded-md text-xs uppercase hover:bg-accent data-[active=true]:font-medium"
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
