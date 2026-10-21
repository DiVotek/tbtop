import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { AdminPageProps } from "@tbtop/admin-node";
import { AdminPage, ensureBuiltinsRegistered } from "@tbtop/inertia-admin";
import type { ReactNode } from "react";
import { InertiaShim } from "../admin/inertia-shim";

/** Page props come from the same admin instance the endpoints use, rebuilt per request. */
const loadAdminPage = createServerFn({ method: "GET" })
	.validator((href: string) => href)
	.handler(async ({ data: href }): Promise<AdminPageProps> => {
		const { admin } = await import("../admin/admin.server");
		const request = getRequest();
		const props = await admin.pageProps(new Request(new URL(href, request.url), { headers: request.headers }));
		if (props instanceof Response) {
			throw notFound();
		}
		return props;
	});

export const Route = createFileRoute("/admin/$")({
	// Loader runs on the server; the client renders in the browser, as under Inertia.
	ssr: "data-only",
	loader: ({ location }) => loadAdminPage({ data: location.href }),
	head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.title} · tbtop` : "tbtop" }] }),
	component: AdminRoute,
});

const withLayout = (AdminPage as unknown as { layout: (page: ReactNode) => ReactNode }).layout;

function AdminRoute() {
	ensureBuiltinsRegistered();
	const props = Route.useLoaderData();
	return <InertiaShim props={props}>{withLayout(<AdminPage />)}</InertiaShim>;
}
