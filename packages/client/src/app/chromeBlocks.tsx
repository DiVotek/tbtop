import { ChevronDownIcon } from "lucide-react";
import { useLocale, useTranslation } from "../i18n/i18n";
import type { RenderProps } from "../render/blockRegistry";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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

interface LocaleSwitcherOptions {
	/** "buttons" (default): a code per button. "dropdown": one trigger + menu. */
	variant?: "buttons" | "dropdown";
}

export function LocaleSwitcherBlock({ options }: RenderProps<LocaleSwitcherOptions>) {
	const { locale, setLocale, available } = useLocale();
	if (available.length === 0) {
		return null;
	}
	if (options?.variant === "dropdown") {
		return <LocaleDropdown locale={locale} setLocale={setLocale} available={available} />;
	}
	return <LocaleButtons locale={locale} setLocale={setLocale} available={available} />;
}

interface LocaleVariantProps {
	locale: string;
	setLocale: (code: string) => void;
	available: string[];
}

function LocaleButtons({ locale, setLocale, available }: LocaleVariantProps) {
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

function LocaleDropdown({ locale, setLocale, available }: LocaleVariantProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				data-testid="locale-switcher"
				className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs uppercase hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{locale}
				<ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-0" data-testid="locale-switcher-menu">
				{available.map((code) => (
					<DropdownMenuItem
						key={code}
						className="cursor-pointer justify-center text-xs uppercase data-[active=true]:font-medium"
						data-active={locale === code}
						data-testid={`locale-switcher-${code}`}
						onSelect={() => setLocale(code)}
					>
						{code}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function SpacerBlock() {
	return <div className="flex-1" data-testid="chrome-spacer" />;
}
