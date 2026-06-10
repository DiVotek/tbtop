import { router, usePage } from "@inertiajs/react";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { AdminLayout } from "../app/AdminLayout";
import { AuthUserProvider } from "../app/authUser";
import { PageParamsProvider } from "../app/pageParams";
import { ClientProvider } from "../data/client";
import { setRoutesBase } from "../data/entityRoutes";
import { I18nProvider } from "../i18n/i18n";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { ContentLocaleConfigProvider } from "../structure/contentLocaleContext";
import type { AuthUser, StructureNode } from "../structure/types";
import { executeEffects, readEffects } from "./effects";
import { materialize } from "./materialize";

interface AdminPageProps {
	slug: string;
	title: string;
	structure: StructureNode;
	data: Record<string, Record<string, unknown>>;
	params?: Record<string, string>;
	tbtop?: {
		effects?: unknown;
		prefix?: string;
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
	const { structure, data, params, title, tbtop, auth } = page.props;
	ensureBuiltinsRegistered();
	if (tbtop?.prefix) {
		setRoutesBase(tbtop.prefix);
	}

	const basePath = page.url.split("?")[0] ?? "";
	const node = useMemo(
		() => materialize(structure, { basePath, data: data ?? {} }),
		[structure, basePath, data],
	);

	const flash = tbtop?.effects;
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
		<ClientProvider>
			<AuthUserProvider user={auth?.user ?? null}>
				<PageParamsProvider params={params ?? {}}>
					<ContentLocaleConfigProvider
						config={{ locales: contentLocales, defaultLocale: defaultContentLocale }}
					>
						<div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
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

// Inertia persistent layout wraps the shell + i18n provider so both the
// sidebar/header (AdminLayout) and page content share the same translation
// context. I18nProvider reads updated props on every Inertia visit.
AdminPage.layout = (page: ReactNode) => <AdminShell>{page}</AdminShell>;

function AdminShell({ children }: { children: ReactNode }) {
	const { props } = usePage<AdminPageProps>();
	const tbtop = props.tbtop;
	const prefix = tbtop?.prefix ?? "";
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
			<AdminLayout>{children}</AdminLayout>
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
