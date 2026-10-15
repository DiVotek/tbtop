import { cn } from "../lib/cn";

/**
 * Shared spinner + reload overlay for async blocks (table, media grid).
 *
 * Upstream's spinner is a spinning Loader icon with no `cn-*` rule; ours stays
 * a CSS ring (sized by `className`) and only adopts upstream's `data-slot`.
 */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
	return (
		<div
			data-slot="spinner"
			className={cn(
				"animate-spin rounded-full border-2 border-primary border-t-transparent",
				className,
			)}
		/>
	);
}

/** Dimming overlay shown over kept-previous data while a refetch is in flight. */
export function ReloadOverlay({ testId }: { testId: string }) {
	return (
		<div
			className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/50"
			data-testid={testId}
		>
			<Spinner />
		</div>
	);
}
