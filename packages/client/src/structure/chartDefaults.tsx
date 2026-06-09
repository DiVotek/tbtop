import { useTranslation } from "../i18n/i18n";

export function ChartSkeleton() {
	return (
		<div className="flex h-[300px] items-end gap-2" data-testid="chart-skeleton">
			<div className="h-1/2 w-full animate-pulse rounded bg-muted" />
			<div className="h-3/4 w-full animate-pulse rounded bg-muted" />
			<div className="h-2/5 w-full animate-pulse rounded bg-muted" />
			<div className="h-full w-full animate-pulse rounded bg-muted" />
		</div>
	);
}

export function ChartError({ message }: { message?: string }) {
	const t = useTranslation();
	return (
		<div
			className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-testid="chart-error"
		>
			{message ?? t("state.error")}
		</div>
	);
}
