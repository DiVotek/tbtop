/**
 * RowActionsCell — trailing-cell actions. Every action renders inline; there is
 * no implicit collapse at any count. To hide actions behind a dropdown, wrap
 * them in an explicit group (S::dropdown / actionGroup) — that entry renders as
 * a row-aware menu, even for a single action.
 */
import { MoreHorizontal } from "lucide-react";
import { useAuthUser } from "../../app/authUser";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { ActionBlock } from "../actionBlock";
import { type ActionOptionsBag, actionKey } from "../actionBlock.shared";
import { isNodeDisabled, isNodeHidden } from "../meta";
import { useNearestRow } from "../rowContext";
import type { ActionConfig, ConditionContext, NodeMeta, StructureNode } from "../types";

export interface ActionGroupConfig {
	kind: "actionGroup";
	label?: string;
	as?: string;
	children?: StructureNode[];
	meta?: NodeMeta;
}

/** A materialized row action: a plain action or an explicit dropdown group. */
export type RowActionEntry = ActionConfig | ActionGroupConfig;

export function RowActionsCell({ actions }: { actions: RowActionEntry[] }) {
	const row = useNearestRow();
	const user = useAuthUser();
	const condCtx: ConditionContext = { record: row ?? undefined, data: row ?? {}, user };
	const visible = actions.filter((entry) => !isNodeHidden(entry.meta, condCtx));
	if (visible.length === 0) {
		return null;
	}
	return (
		<div className="flex items-center justify-end gap-1">
			{visible.map((entry, i) =>
				isActionGroupEntry(entry) ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: groups carry no stable id
					<RowActionGroup key={i} entry={entry} condCtx={condCtx} />
				) : (
					<ActionBlock
						key={entry.name}
						options={entry}
						meta={entry.meta ?? {}}
						disabled={isNodeDisabled(entry.meta, condCtx)}
					/>
				),
			)}
		</div>
	);
}

/** A materialized actionGroup entry (S::dropdown / actionGroup) vs a plain action. */
export function isActionGroupEntry(entry: RowActionEntry): entry is ActionGroupConfig {
	return (entry as ActionGroupConfig).kind === "actionGroup";
}

/**
 * An explicit dropdown group inside a row. Each child's hiddenIf/disabledIf is
 * pre-evaluated against the row context here: the generic render path is
 * row-blind (renderNode evaluates with an empty condition context and never
 * checks disabledIf), so a row-dependent condition on a grouped action would
 * otherwise be silently ignored.
 */
function RowActionGroup({
	entry,
	condCtx,
}: {
	entry: ActionGroupConfig;
	condCtx: ConditionContext;
}) {
	const t = useTranslation();
	const visible = (entry.children ?? [])
		.filter((child) => !isNodeHidden(child.meta, condCtx))
		.map((child) => ({ child, disabled: isNodeDisabled(child.meta, condCtx) }));
	if (visible.length === 0) {
		return null;
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={entry.label || t("table.actions.label")}
					data-testid="action-group-trigger"
				>
					<MoreHorizontal className="size-4" aria-hidden />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" data-testid="action-group-menu">
				{visible.map(({ child, disabled }) => {
					const opts = child.options as ActionOptionsBag;
					return (
						<DropdownMenuItem
							key={actionKey(opts)}
							asChild
							onSelect={(e) => e.preventDefault()}
						>
							<div className="w-full">
								<ActionBlock
									options={opts}
									meta={child.meta ?? {}}
									disabled={disabled}
								/>
							</div>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
