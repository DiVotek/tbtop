/**
 * BulkActionsBar — selected-count and bulk actions, shown only
 * once at least one row is selected.
 */
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { ActionBlock } from "../actionBlock";
import type { ActionConfig } from "../types";

interface BulkActionsBarProps {
	actions: ActionConfig[];
	selectedCount: number;
}

export function BulkActionsBar({ actions, selectedCount }: BulkActionsBarProps) {
	const t = useTranslation();
	const active = selectedCount > 0;
	// Slot stays mounted; contents appear only with a selection.
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-3",
				active && "rounded-md border bg-muted/40 px-3 py-2",
			)}
			data-testid="table-bulk-actions"
		>
			{active && (
				<>
					<span className="text-sm font-medium" data-testid="bulk-selected-count">
						{t("table.selected_count").replace("{count}", String(selectedCount))}
					</span>
					<div className="ml-auto flex items-center gap-2">
						{actions.map((cfg) => (
							<ActionBlock key={cfg.name} options={cfg} meta={{}} />
						))}
					</div>
				</>
			)}
		</div>
	);
}
