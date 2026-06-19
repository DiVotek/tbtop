/**
 * RowActionsCell — trailing-cell actions; first ROW_ACTION_INLINE_MAX
 * inline, the rest in an overflow menu. Each stays an ActionBlock.
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
import { isNodeDisabled, isNodeHidden } from "../meta";
import { useNearestRow } from "../rowContext";
import type { ActionConfig, ConditionContext } from "../types";

const ROW_ACTION_INLINE_MAX = 2;

/** An action that survived hiddenIf, plus its pre-evaluated disabledIf result. */
interface VisibleAction {
	cfg: ActionConfig;
	disabled: boolean;
}

export function RowActionsCell({ actions }: { actions: ActionConfig[] }) {
	const row = useNearestRow();
	const user = useAuthUser();
	const condCtx: ConditionContext = { record: row ?? undefined, data: row ?? {}, user };
	const visible: VisibleAction[] = actions
		.filter((cfg) => !isNodeHidden(cfg.meta, condCtx))
		.map((cfg) => ({ cfg, disabled: isNodeDisabled(cfg.meta, condCtx) }));

	if (visible.length <= ROW_ACTION_INLINE_MAX) {
		return (
			<div className="flex items-center justify-end gap-1">
				{visible.map(({ cfg, disabled }) => (
					<ActionBlock
						key={cfg.name}
						options={cfg}
						meta={cfg.meta ?? {}}
						disabled={disabled}
					/>
				))}
			</div>
		);
	}
	return <RowActionsMenu actions={visible} />;
}

function RowActionsMenu({ actions }: { actions: VisibleAction[] }) {
	const t = useTranslation();
	return (
		<div className="flex justify-end">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t("table.actions.label")}
						data-testid="row-actions-trigger"
					>
						<MoreHorizontal className="size-4" aria-hidden />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{actions.map(({ cfg, disabled }) => (
						<DropdownMenuItem
							key={cfg.name}
							asChild
							onSelect={(e) => e.preventDefault()}
						>
							<div className="w-full">
								<ActionBlock
									options={cfg}
									meta={cfg.meta ?? {}}
									disabled={disabled}
								/>
							</div>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
