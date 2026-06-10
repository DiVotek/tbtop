import { AsyncErrorBox } from "./asyncErrorBox";

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
	return <AsyncErrorBox testId="chart-error" message={message} />;
}
