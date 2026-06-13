import { router, usePage } from "@inertiajs/react";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { AdminLayout } from "../app/AdminLayout";
import { AuthUserProvider } from "../app/authUser";
import { CenterLayout } from "../app/CenterLayout";
import { PageParamsProvider } from "../app/pageParams";
import { ClientProvider } from "../data/client";
import { setRoutesBase } from "../data/entityRoutes";
import { I18nProvider } from "../i18n/i18n";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { ContentLocaleConfigProvider } from "../structure/contentLocaleContext";
import type { AuthUser, StructureNode } from "../structure/types";
import { type BreadcrumbItem, Breadcrumbs } from "./Breadcrumbs";
import { executeEffects, readEffects } from "./effects";
import { materialize } from "./materialize";

interface AdminPageProps {
	slug: string;
	title: string;
	layout?: "admin" | "center";
	structure: StructureNode;
	data: Record<string, Record<string, unknown>>;
	breadcrumbs?: BreadcrumbItem[];
	params?: Record<string, string>;
	tbtop?: {
		panel?: string;
		prefix?: string;
		apiBase?: string;
		locale?: string;
		locales?: string[];
		messages?: Record<string, string>;
		contentLocales?: string[];
		defaultContentLocale?: string;
	};
	auth?: { user?: AuthUser | null };
	[key: string]: unknown;
}

/**
 * The single Inertia page component: every server-authored admin page
 * renders through it. Flash effects execute once per props identity.
 */
export function AdminPage() {
	const page = usePage<AdminPageProps>();
	const { structure, data, params, title, breadcrumbs, tbtop, auth } = page.props;
	ensureBuiltinsRegistered();
	if (tbtop?.prefix) {
		setRoutesBase(tbtop.prefix);
	}
	const apiBase = tbtop?.apiBase ?? "";

	const basePath = page.url.split("?")[0] ?? "";
	const node = useMemo(
		() => materialize(structure, { basePath, data: data ?? {} }),
		[structure, basePath, data],
	);

	// Native Inertia flash: the adapter delivers a fresh object per response,
	// so identical consecutive effects still re-trigger this (shared props
	// would be reference-deduped by preserveEqualProps and fire only once).
	const flash = (page.flash as Record<string, unknown> | undefined)?.["tbtop.effects"];
	useEffect(() => {
		const effects = readEffects(flash);
		if (effects.length > 0) {
			executeEffects(effects, {
				notify: (msg) => notifyToast(msg.kind, msg.message),
			});
		}
	}, [flash]);

	const contentLocales = tbtop?.contentLocales ?? ["en"];
	const defaultContentLocale = tbtop?.defaultContentLocale ?? contentLocales[0] ?? "en";

	return (
		<ClientProvider apiBase={apiBase}>
			<AuthUserProvider user={auth?.user ?? null}>
				<PageParamsProvider params={params ?? {}}>
					<ContentLocaleConfigProvider
						config={{ locales: contentLocales, defaultLocale: defaultContentLocale }}
					>
						<div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
							{breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
							<h1 className="text-2xl font-semibold">{title}</h1>
							{renderNode(node)}
						</div>
						<Toaster />
					</ContentLocaleConfigProvider>
				</PageParamsProvider>
			</AuthUserProvider>
		</ClientProvider>
	);
}

// Inertia persistent layout: dispatches to AdminShell or CenterShell based on
// the 'layout' page prop. The Toaster is mounted inside AdminPage (page content)
// so it is present regardless of which shell wraps the page.
AdminPage.layout = (page: ReactNode) => <LayoutDispatcher>{page}</LayoutDispatcher>;

function LayoutDispatcher({ children }: { children: ReactNode }) {
	const { props } = usePage<AdminPageProps>();
	if (props.layout === "center") {
		return <CenterLayout>{children}</CenterLayout>;
	}
	return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: ReactNode }) {
	const { props } = usePage<AdminPageProps>();
	const tbtop = props.tbtop;
	const prefix = tbtop?.prefix ?? "";
	const apiBase = tbtop?.apiBase ?? "";
	const locale = tbtop?.locale ?? "en";
	const locales = tbtop?.locales ?? [locale];
	const messages = tbtop?.messages ?? {};
	const pluginMessages: Record<string, Record<string, string>> = { [locale]: messages };
	const languages = Object.fromEntries(locales.map((code) => [code, async () => ({})]));

	// Round-trip: session stores the locale, redirect back
	// delivers fresh tbtop.messages in shared props.
	const persistLocale = useCallback(
		(next: string) => {
			router.post(`${prefix}/locale`, { locale: next }, { preserveScroll: true });
		},
		[prefix],
	);

	return (
		<I18nProvider
			defaultLang={locale}
			languages={languages}
			pluginMessages={pluginMessages}
			onLocaleChange={persistLocale}
		>
			{/* Chrome trees may carry action blocks; they resolve their client
			    here, outside the page-level provider inside AdminPage. */}
			<ClientProvider apiBase={apiBase}>
				<AdminLayout>{children}</AdminLayout>
			</ClientProvider>
		</I18nProvider>
	);
}

function notifyToast(kind: string | undefined, message: string): void {
	if (kind === "error") {
		toast.error(message);
	} else if (kind === "warning") {
		toast.warning(message);
	} else {
		toast.success(message);
	}
}
