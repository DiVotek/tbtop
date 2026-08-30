import { Head, router, usePage } from "@inertiajs/react";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { AdminLayout } from "../app/AdminLayout";
import { type Appearance, MAX_WIDTH_CLASS } from "../app/appearance";
import { AuthUserProvider } from "../app/authUser";
import { CenterLayout } from "../app/CenterLayout";
import { PageParamsProvider } from "../app/pageParams";
import { ClientProvider } from "../data/client";
import { setRoutesBase } from "../data/entityRoutes";
import { I18nProvider, useTranslation } from "../i18n/i18n";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { ActionBlock } from "../structure/actionBlock";
import { ContentLocaleConfigProvider } from "../structure/contentLocaleContext";
import { ModalStackProvider, useModalStack } from "../structure/modalStack";
import {
	PageContentErrorBoundary,
	PageContentErrorPanel,
} from "../structure/pageContentErrorBoundary";
import { PageSubtitleProvider, usePageSubtitle } from "../structure/pageSubtitleContext";
import type { ActionConfig, AuthUser, StructureNode } from "../structure/types";
import { type BreadcrumbItem, Breadcrumbs } from "./Breadcrumbs";
import { readEffects } from "./effects";
import { executeFlashEffects } from "./flashEffects";
import { materialize, materializeActionList } from "./materialize";
import { pageBasePath } from "./pageBasePath";

interface AdminPageProps {
	slug: string;
	title: string;
	/** Optional line rendered under the page title. */
	subtitle?: string;
	/** Actions rendered right of the title/subtitle block. */
	headerActions?: StructureNode[];
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
		appearance?: Appearance | null;
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
	const t = useTranslation();
	const { structure, data, params, title, subtitle, headerActions, breadcrumbs, tbtop, auth } =
		page.props;
	ensureBuiltinsRegistered();
	if (tbtop?.prefix) {
		setRoutesBase(tbtop.prefix);
	}
	const apiBase = tbtop?.apiBase ?? "";
	const contentLocales = tbtop?.contentLocales ?? ["en"];
	const defaultContentLocale = tbtop?.defaultContentLocale ?? contentLocales[0] ?? "en";

	const basePath = pageBasePath(page.url);
	// materialize runs in AdminPage's own render, so a throw there would escape
	// PageContentErrorBoundary (a boundary only catches its descendants) and
	// white-screen the whole app. Catching here routes it to the same panel.
	// Content and header actions are caught independently: a malformed header
	// action must not hide healthy page content, and vice versa.
	const node = useMemo(
		() =>
			attempt(() =>
				materialize(structure, { basePath, data: data ?? {}, defaultContentLocale, t }),
			),
		[structure, basePath, data, defaultContentLocale, t],
	);
	const headerActionBags = useMemo(
		() =>
			attempt(() =>
				materializeActionList(headerActions ?? [], {
					basePath,
					data: data ?? {},
					defaultContentLocale,
					t,
				}),
			),
		[headerActions, basePath, data, defaultContentLocale, t],
	);

	const flash = (page.flash as Record<string, unknown> | undefined)?.["tbtop.effects"];

	// Panel-configured content width (appearance.maxWidth); 5xl matches the
	// pre-option behavior for panels that never set it.
	const widthToken = tbtop?.appearance?.maxWidth;
	const maxWidth = (widthToken && MAX_WIDTH_CLASS[widthToken]) || "max-w-5xl";
	// Center-layout pages (auth screens) own their heading inside the content —
	// the admin page-header chrome (breadcrumbs/h1/subtitle/actions) would duplicate it.
	const showPageHeader = page.props.layout !== "center";

	return (
		<ClientProvider apiBase={apiBase}>
			<AuthUserProvider user={auth?.user ?? null}>
				<PageParamsProvider params={params ?? {}}>
					<ContentLocaleConfigProvider
						config={{ locales: contentLocales, defaultLocale: defaultContentLocale }}
					>
						<PageSubtitleProvider>
							<ModalStackProvider>
								<FlashEffects flash={flash} />
								<Head title={title} />
								<div className={`mx-auto flex ${maxWidth} flex-col gap-6 p-6`}>
									{showPageHeader && breadcrumbs && (
										<Breadcrumbs items={breadcrumbs} />
									)}
									{showPageHeader && (
										<div className="flex items-start justify-between gap-4">
											<div>
												<h1 className="text-2xl font-semibold tracking-tight">
													{title}
												</h1>
												<PageSubtitle staticSubtitle={subtitle} />
											</div>
											{headerActionBags.ok ? (
												<PageHeaderActions
													actions={headerActionBags.value}
												/>
											) : (
												<PageContentErrorPanel
													error={headerActionBags.error}
													t={t}
												/>
											)}
										</div>
									)}
									<PageContentErrorBoundary resetKey={page.url}>
										{node.ok ? (
											renderNode(node.value)
										) : (
											<PageContentErrorPanel error={node.error} t={t} />
										)}
									</PageContentErrorBoundary>
								</div>
							</ModalStackProvider>
						</PageSubtitleProvider>
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

/** Shared by AdminErrorPage so an error keeps the panel shell of a normal page. */
export function LayoutDispatcher({ children }: { children: ReactNode }) {
	const { props } = usePage<AdminPageProps>();
	const tbtop = props.tbtop;
	const prefix = tbtop?.prefix ?? "";
	const apiBase = tbtop?.apiBase ?? "";
	const locale = tbtop?.locale ?? "en";
	// Stable identities: both feed I18nProvider's hydration effect deps, and the
	// `??` fallbacks below would otherwise allocate fresh values every render.
	const pluginMessages = useMemo<Record<string, Record<string, string>>>(
		() => ({ [locale]: tbtop?.messages ?? {} }),
		[locale, tbtop?.messages],
	);
	const languages = useMemo(() => {
		const codes = tbtop?.locales ?? [locale];
		return Object.fromEntries(codes.map((code) => [code, async () => ({})]));
	}, [locale, tbtop?.locales]);

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
			locale={locale}
			defaultLang={locale}
			languages={languages}
			pluginMessages={pluginMessages}
			onLocaleChange={persistLocale}
		>
			{/* Chrome action blocks resolve their client here, outside AdminPage's
			    own provider. Shared even for center (chrome-less) — one shape. */}
			<ClientProvider apiBase={apiBase}>
				{props.layout === "center" ? (
					<CenterLayout>{children}</CenterLayout>
				) : (
					<AdminLayout>{children}</AdminLayout>
				)}
			</ClientProvider>
		</I18nProvider>
	);
}

type Attempt<T> = { ok: true; value: T } | { ok: false; error: Error };

/**
 * Runs a materialize pass, converting a throw into an error result. Logs with
 * the stack: the on-screen message alone would otherwise be the only trace.
 */
function attempt<T>(run: () => T): Attempt<T> {
	try {
		return { ok: true, value: run() };
	} catch (cause) {
		const error = cause instanceof Error ? cause : new Error(String(cause));
		console.error("[tabletop] failed to materialize page structure", error);
		return { ok: false, error };
	}
}

/**
 * Native Inertia flash: the adapter delivers a fresh object per response, so
 * identical consecutive effects still re-trigger (shared props would be
 * reference-deduped by preserveEqualProps and fire only once). Rendered inside
 * ModalStackProvider so closeModal can reach the page's open modals.
 */
function FlashEffects({ flash }: { flash: unknown }) {
	const modals = useModalStack();
	useEffect(() => {
		const effects = readEffects(flash);
		if (effects.length > 0) {
			executeFlashEffects(effects, {
				notify: (msg) => notifyToast(msg.kind, msg.message),
				modals,
			});
		}
	}, [flash, modals]);
	return null;
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

/**
 * Subtitle line under the page title. An active table tab's description()
 * (pushed via PageSubtitleContext) takes priority over the page's own static
 * subtitle prop — it reflects what the user is currently looking at.
 */
function PageSubtitle({ staticSubtitle }: { staticSubtitle?: string }) {
	const tabSubtitle = usePageSubtitle();
	const text = tabSubtitle ?? staticSubtitle;
	if (!text) {
		return null;
	}
	return <p className="mt-1 text-sm text-muted-foreground">{text}</p>;
}

/** Actions rendered right of the title/subtitle block; empty renders nothing. */
function PageHeaderActions({ actions }: { actions: ActionConfig[] }) {
	if (actions.length === 0) {
		return null;
	}
	return (
		<div className="flex shrink-0 items-center gap-2" data-testid="page-header-actions">
			{actions.map((action) => (
				<ActionBlock key={action.name} options={action} meta={action.meta ?? {}} />
			))}
		</div>
	);
}
