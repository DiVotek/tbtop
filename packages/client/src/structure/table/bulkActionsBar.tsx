/**
 * BulkActionsBar — selected-count and bulk actions, shown only
 * once at least one row is selected.
 */
import { useAuthUser } from "../../app/authUser";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { ActionBlock } from "../actionBlock";
import { isNodeDisabled, isNodeHidden } from "../meta";
import type { ActionConfig, ConditionContext } from "../types";

interface BulkActionsBarProps {
	actions: ActionConfig[];
	selectedCount: number;
}

export function BulkActionsBar({ actions, selectedCount }: BulkActionsBarProps) {
	const t = useTranslation();
	const user = useAuthUser();
	const active = selectedCount > 0;
	// No single row → conditions key off the current user (role-gating) or the
	// selection size; row-field conditions are simply false here.
	const condCtx: ConditionContext = { record: undefined, data: { selectedCount }, user };
	const visible = actions.filter((cfg) => !isNodeHidden(cfg.meta, condCtx));
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
						{visible.map((cfg) => (
							<ActionBlock
								key={cfg.name}
								options={cfg}
								meta={cfg.meta ?? {}}
								disabled={isNodeDisabled(cfg.meta, condCtx)}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}
