/**
 * Header action rows (Page headerActions, table headerActions). A wire header
 * action is either a plain action or an explicit group (S.dropdown /
 * actionGroup); a group renders through ActionGroupBlock so its children land
 * in a menu instead of an empty button.
 */
import { renderNode } from "../render/structureRenderer";
import { ActionBlock } from "./actionBlock";
import { type ActionGroupConfig, isActionGroupEntry } from "./table/rowActions";
import type { ActionConfig } from "./types";

export function HeaderActionList({
	actions,
	className,
	testId,
}: {
	actions: ActionConfig[];
	className: string;
	testId: string;
}) {
	if (actions.length === 0) {
		return null;
	}
	return (
		<div className={className} data-testid={testId}>
			{actions.map((entry, i) =>
				isActionGroupEntry(entry) ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: groups carry no stable id
					<HeaderActionGroup key={i} entry={entry} />
				) : (
					<ActionBlock key={entry.name} options={entry} meta={entry.meta ?? {}} />
				),
			)}
		</div>
	);
}

function HeaderActionGroup({ entry }: { entry: ActionGroupConfig }) {
	const { kind, meta, ...options } = entry;
	return <>{renderNode({ kind, options, meta: meta ?? {} })}</>;
}
