import { Link, usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { ProfileDropdown } from "./ProfileDropdown";

interface NavItem {
	label: string;
	href: string;
}

export interface NavGroup {
	group: string;
	items: NavItem[];
}

interface SharedProps {
	tbtop?: { nav?: NavGroup[] };
	auth?: { user?: { name?: string; email?: string } | null };
	[key: string]: unknown;
}

export interface AdminLayoutSlotProps {
	nav: NavGroup[];
	user: { name?: string; email?: string } | null;
}

export interface AdminLayoutSlots {
	header?: (props: AdminLayoutSlotProps) => ReactNode;
	sidebar?: (props: AdminLayoutSlotProps) => ReactNode;
	footer?: (props: AdminLayoutSlotProps) => ReactNode;
	logo?: (props: AdminLayoutSlotProps) => ReactNode;
}

interface AdminLayoutProps {
	children: ReactNode;
	slots?: AdminLayoutSlots;
}

export interface AdminLayoutShellProps {
	nav: NavGroup[];
	user: { name?: string; email?: string } | null;
	currentUrl: string;
	children: ReactNode;
	slots?: AdminLayoutSlots;
}

/**
 * Pure shell — testable without Inertia context. Receives nav/user/url as props.
 */
export function AdminLayoutShell({
	nav,
	user,
	currentUrl,
	children,
	slots,
}: AdminLayoutShellProps) {
	const t = useTranslation();
	const slotProps: AdminLayoutSlotProps = { nav, user };

	const sidebar = slots?.sidebar ? (
		slots.sidebar(slotProps)
	) : (
		<DefaultSidebar nav={nav} currentUrl={currentUrl} t={t} logo={slots?.logo?.(slotProps)} />
	);

	const header = slots?.header ? slots.header(slotProps) : <DefaultHeader user={user} />;

	const footer = slots?.footer ? slots.footer(slotProps) : null;

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<aside className="flex w-56 shrink-0 flex-col gap-4 border-r p-4">{sidebar}</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-end gap-3 border-b px-6 py-3">
					{header}
				</header>
				<main className="min-w-0 flex-1">{children}</main>
				{footer && <footer>{footer}</footer>}
			</div>
		</div>
	);
}

/**
 * Persistent admin shell: sidebar from server-built nav shared props,
 * topbar with profile dropdown. Supports slot overrides for chrome customisation.
 */
export function AdminLayout({ children, slots }: AdminLayoutProps) {
	const { props, url } = usePage<SharedProps>();
	const nav = props.tbtop?.nav ?? [];
	const user = props.auth?.user ?? null;

	return (
		<AdminLayoutShell nav={nav} user={user} currentUrl={url} slots={slots}>
			{children}
		</AdminLayoutShell>
	);
}

interface DefaultSidebarProps {
	nav: NavGroup[];
	currentUrl: string;
	t: (key: string) => string;
	logo?: ReactNode;
}

function DefaultSidebar({ nav, currentUrl, t, logo }: DefaultSidebarProps) {
	return (
		<>
			<div className="text-lg font-semibold">{logo ?? t("nav.title")}</div>
			<nav className="flex flex-col gap-4" data-testid="admin-sidebar">
				{nav.map((group) => (
					<NavGroupSection key={group.group} group={group} currentUrl={currentUrl} />
				))}
			</nav>
		</>
	);
}

function DefaultHeader({ user }: { user: { name?: string; email?: string } | null }) {
	return <ProfileDropdown user={user} />;
}

function NavGroupSection({ group, currentUrl }: { group: NavGroup; currentUrl: string }) {
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
