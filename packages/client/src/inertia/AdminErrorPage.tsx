import { Head, Link, usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/i18n";
import { LayoutDispatcher } from "./AdminPage";

interface AdminErrorPageProps {
	status: number;
	title: string;
	message: string;
	tbtop?: { prefix?: string };
	[key: string]: unknown;
}

/**
 * The `admin/error` Inertia page: an HTTP error (404 today) rendered inside
 * the same panel shell as a normal page, so the visitor keeps the nav. The
 * server sends the title/message already translated; only the way home is
 * a client string.
 */
export function AdminErrorPage() {
	const { props } = usePage<AdminErrorPageProps>();
	const t = useTranslation();
	const homeUrl = props.tbtop?.prefix || "/";

	return (
		<>
			<Head title={props.title} />
			<div
				className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"
				data-testid="admin-error-page"
			>
				<p className="text-5xl font-semibold tracking-tight text-muted-foreground">
					{props.status}
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
				<p className="text-sm text-muted-foreground">{props.message}</p>
				<Link
					href={homeUrl}
					className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
				>
					{t("state.backToPanel")}
				</Link>
			</div>
		</>
	);
}

AdminErrorPage.layout = (page: ReactNode) => <LayoutDispatcher>{page}</LayoutDispatcher>;
