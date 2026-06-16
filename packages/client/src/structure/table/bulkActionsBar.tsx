/**
 * BulkActionsBar — contextual bar shown only while rows are selected. Leads
 * with the selected-count, trails with the configured bulk actions.
 * Extracted from tableBlock.tsx.
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
	// The bar stays mounted so its actions are always reachable; it only adopts
	// the contextual "selection" treatment (border/fill + count) once rows are
	// selected.
	return (
		<div
			className={cn(
				"flex items-center gap-3",
				active && "rounded-md border bg-muted/40 px-3 py-2",
			)}
			data-testid="table-bulk-actions"
		>
			{active && (
				<span className="text-sm font-medium" data-testid="bulk-selected-count">
					{t("table.selected_count").replace("{count}", String(selectedCount))}
				</span>
			)}
			<div className={cn("flex items-center gap-2", active && "ml-auto")}>
				{actions.map((cfg) => (
					<ActionBlock key={cfg.name} options={cfg} meta={{}} />
				))}
			</div>
		</div>
	);
}
