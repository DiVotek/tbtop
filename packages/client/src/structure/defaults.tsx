import { useTranslation } from "../i18n/i18n";

export function FormSkeleton() {
	return (
		<div className="flex flex-col gap-2" data-testid="form-skeleton">
			<div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
			<div className="h-9 w-full animate-pulse rounded bg-muted" />
			<div className="h-9 w-full animate-pulse rounded bg-muted" />
		</div>
	);
}

export function FormError({ message }: { message?: string }) {
	const t = useTranslation();
	return (
		<div
			className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-testid="form-error"
		>
			{message ?? t("state.error")}
		</div>
	);
}

export function TableSkeleton() {
	return (
		<div className="flex flex-col gap-2" data-testid="table-skeleton">
			<div className="h-8 w-full animate-pulse rounded bg-muted" />
			<div className="h-8 w-full animate-pulse rounded bg-muted" />
			<div className="h-8 w-full animate-pulse rounded bg-muted" />
		</div>
	);
}

export function TableError({ message }: { message?: string }) {
	const t = useTranslation();
	return (
		<div
			className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-testid="table-error"
		>
			{message ?? t("state.error")}
		</div>
	);
}
