/**
 * EmptyState — empty table body. Separates "no records" from
 * "no filter matches", offering a reset in the latter.
 */
import { Inbox, SearchX } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";

interface EmptyStateProps {
	hasActiveFilters: boolean;
	onReset: () => void;
}

export function EmptyState({ hasActiveFilters, onReset }: EmptyStateProps) {
	const t = useTranslation();
	const Icon = hasActiveFilters ? SearchX : Inbox;
	const heading = hasActiveFilters ? t("table.empty.no_results") : t("table.empty.no_records");

	return (
		<div
			className="flex flex-col items-center gap-3 py-12 text-center"
			data-testid="table-empty"
		>
			<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
				<Icon className="size-6" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-foreground">{heading}</p>
				<p className="text-xs text-muted-foreground">
					{hasActiveFilters
						? t("table.empty.no_results_hint")
						: t("table.empty.no_records_hint")}
				</p>
			</div>
			{hasActiveFilters && (
				<Button
					variant="outline"
					size="sm"
					onClick={onReset}
					data-testid="table-empty-reset"
				>
					{t("table.empty.reset")}
				</Button>
			)}
		</div>
	);
}
