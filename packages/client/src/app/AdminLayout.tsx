import { Link, router, usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { Button } from "../ui/button";

interface NavItem {
	label: string;
	href: string;
}

interface NavGroup {
	group: string;
	items: NavItem[];
}

interface SharedProps {
	tbtop?: { nav?: NavGroup[] };
	auth?: { user?: { name?: string; email?: string } | null };
	[key: string]: unknown;
}

/**
 * Persistent admin shell: sidebar from server-built nav shared props,
 * topbar with the session user. Survives Inertia visits unmounted.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
	const t = useTranslation();
	const { props, url } = usePage<SharedProps>();
	const nav = props.tbtop?.nav ?? [];
	const user = props.auth?.user ?? null;

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<aside className="flex w-56 shrink-0 flex-col gap-4 border-r p-4">
				<div className="text-lg font-semibold">{t("nav.title")}</div>
				<nav className="flex flex-col gap-4" data-testid="admin-sidebar">
					{nav.map((group) => (
						<NavGroupSection key={group.group} group={group} currentUrl={url} />
					))}
				</nav>
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-end gap-3 border-b px-6 py-3">
					<LanguageSwitcher />
					{user && (
						<span className="text-sm text-muted-foreground" data-testid="topbar-user">
							{user.name ?? user.email}
						</span>
					)}
					{user && (
						<Button variant="outline" size="sm" onClick={() => router.post("/logout")}>
							{t("action.logout")}
						</Button>
					)}
				</header>
				<main className="min-w-0 flex-1">{children}</main>
			</div>
		</div>
	);
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
