/**
 * TableError — async-failure state for a table, with an icon and a Retry
 * button wired to the block's refetch.
 */
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";

interface TableErrorProps {
	message?: string;
	onRetry?: () => void;
}

export function TableError({ message, onRetry }: TableErrorProps) {
	const t = useTranslation();
	return (
		<div
			className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-testid="table-error"
		>
			<AlertTriangle className="size-4 shrink-0" aria-hidden />
			<span className="flex-1">{message ?? t("state.error")}</span>
			{onRetry && (
				<Button
					variant="outline"
					size="sm"
					onClick={onRetry}
					data-testid="table-error-retry"
				>
					{t("table.error.retry")}
				</Button>
			)}
		</div>
	);
}
