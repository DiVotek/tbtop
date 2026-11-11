/**
 * BulkActionsBar — selected-count and bulk actions, shown only
 * once at least one row is selected. With the whole page checked and more
 * rows matching, it offers to widen the pick to all of them.
 */
import type { ReactNode } from "react";
import { useAuthUser } from "../../app/authUser";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { ActionBlock } from "../actionBlock";
import { isNodeDisabled, isNodeHidden } from "../meta";
import type { ActionConfig, ConditionContext } from "../types";

/** The "select all matching" offer; absent when the table has no total to offer. */
export interface MatchingSelection {
	total: number;
	/** Every row on the current page is checked. */
	pageSelected: boolean;
	allMatching: boolean;
	onSelectAll: () => void;
	onClear: () => void;
}

interface BulkActionsBarProps {
	actions: ActionConfig[];
	selectedCount: number;
	matching?: MatchingSelection;
}

export function BulkActionsBar({ actions, matching, ...props }: BulkActionsBarProps) {
	const t = useTranslation();
	const user = useAuthUser();
	const active = props.selectedCount > 0;
	const allMatching = active && matching?.allMatching === true;
	const selectedCount = allMatching ? matching.total : props.selectedCount;
	// No single row → conditions key off the current user (role-gating) or the
	// selection size; row-field conditions are simply false here.
	const condCtx: ConditionContext = { record: undefined, data: { selectedCount }, user };
	const visible = actions.filter((cfg) => !isNodeHidden(cfg.meta, condCtx));
	// Slot stays mounted; contents appear only with a selection.
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-3",
				active && "rounded-surface border bg-muted/40 px-3 py-2",
			)}
			data-testid="table-bulk-actions"
		>
			{active && (
				<>
					<span className="text-sm font-medium" data-testid="bulk-selected-count">
						{allMatching
							? t("table.all_matching_selected").replace(
									"{total}",
									String(selectedCount),
								)
							: t("table.selected_count").replace("{count}", String(selectedCount))}
					</span>
					{matching && (
						<MatchingToggle matching={matching} selectedCount={selectedCount} />
					)}
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

function MatchingToggle({
	matching,
	selectedCount,
}: {
	matching: MatchingSelection;
	selectedCount: number;
}) {
	const t = useTranslation();
	if (matching.allMatching) {
		return (
			<LinkButton onClick={matching.onClear} testId="bulk-clear-selection">
				{t("table.clear_selection")}
			</LinkButton>
		);
	}
	if (!matching.pageSelected || matching.total <= selectedCount) {
		return null;
	}
	return (
		<LinkButton onClick={matching.onSelectAll} testId="bulk-select-all-matching">
			{t("table.select_all_matching").replace("{total}", String(matching.total))}
		</LinkButton>
	);
}

function LinkButton(props: { onClick: () => void; testId: string; children: ReactNode }) {
	return (
		<button
			type="button"
			className="text-sm font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
			onClick={props.onClick}
			data-testid={props.testId}
		>
			{props.children}
		</button>
	);
}
