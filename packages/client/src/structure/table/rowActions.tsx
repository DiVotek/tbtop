/**
 * RowActionsCell — trailing-cell actions. Every action renders inline; there is
 * no implicit collapse at any count. To hide actions behind a dropdown, wrap
 * them in an explicit group (S::dropdown / actionGroup) — that entry renders as
 * a row-aware menu, even for a single action.
 */
import { useAuthUser } from "../../app/authUser";
import { renderNode } from "../../render/structureRenderer";
import { ActionBlock } from "../actionBlock";
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
					<RowActionGroup key={i} entry={entry} />
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

function RowActionGroup({ entry }: { entry: ActionGroupConfig }) {
	const node: StructureNode = {
		kind: "actionGroup",
		options: { label: entry.label ?? "", children: entry.children ?? [], as: "dropdown" },
		meta: {},
	};
	return <>{renderNode(node)}</>;
}
