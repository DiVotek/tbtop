/** Shared spinner + reload overlay for async blocks (table, media grid). */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
	return (
		<div
			className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`}
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
