import { AsyncErrorBox } from "./asyncErrorBox";

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
	return <AsyncErrorBox testId="form-error" message={message} />;
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
	return <AsyncErrorBox testId="table-error" message={message} />;
}
