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

const SKELETON_COLS = 4;
const SKELETON_ROWS = 5;

/**
 * Loading placeholder that mirrors the real grid's bordered shell + text-sm/
 * px-3 py-2 rhythm, so swapping to live data does not shift the layout.
 */
export function TableSkeleton() {
	return (
		<div
			className="overflow-hidden rounded-md border text-sm"
			data-testid="table-skeleton"
			aria-hidden
		>
			<table className="w-full">
				<thead className="border-b bg-muted">
					<tr>
						{Array.from({ length: SKELETON_COLS }, (_, c) => (
							<th key={`h-${c}`} className="px-3 py-2 text-left">
								<div className="h-3 w-20 animate-pulse rounded bg-muted-foreground/20" />
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{Array.from({ length: SKELETON_ROWS }, (_, r) => (
						<tr key={`r-${r}`} className="border-t">
							{Array.from({ length: SKELETON_COLS }, (_, c) => (
								<td key={`c-${r}-${c}`} className="px-3 py-2">
									<div className="h-4 w-full animate-pulse rounded bg-muted" />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
