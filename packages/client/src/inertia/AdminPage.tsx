import { usePage } from "@inertiajs/react";
import { type ReactNode, useEffect, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { AdminLayout } from "../app/AdminLayout";
import { AuthUserProvider } from "../app/authUser";
import { PageParamsProvider } from "../app/pageParams";
import { ClientProvider } from "../data/client";
import { setRoutesBase } from "../data/entityRoutes";
import { I18nProvider } from "../i18n/i18n";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import type { AuthUser, StructureNode } from "../structure/types";
import { executeEffects, readEffects } from "./effects";
import { materialize } from "./materialize";

interface AdminPageProps {
	slug: string;
	title: string;
	structure: StructureNode;
	data: Record<string, Record<string, unknown>>;
	params?: Record<string, string>;
	tbtop?: { effects?: unknown; prefix?: string };
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

	return (
		<ClientProvider>
			<AuthUserProvider user={auth?.user ?? null}>
				<PageParamsProvider params={params ?? {}}>
					<I18nProvider>
						<div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
							<h1 className="text-2xl font-semibold">{title}</h1>
							{renderNode(node)}
						</div>
						<Toaster />
					</I18nProvider>
				</PageParamsProvider>
			</AuthUserProvider>
		</ClientProvider>
	);
}

// Inertia persistent layout: the shell survives page visits unmounted.
AdminPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

function notifyToast(kind: string | undefined, message: string): void {
	if (kind === "error") {
		toast.error(message);
	} else if (kind === "warning") {
		toast.warning(message);
	} else {
		toast.success(message);
	}
}
