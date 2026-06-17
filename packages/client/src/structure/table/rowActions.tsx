/**
 * RowActionsCell — trailing-cell actions; first ROW_ACTION_INLINE_MAX
 * inline, the rest in an overflow menu. Each stays an ActionBlock.
 */
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { ActionBlock } from "../actionBlock";
import type { ActionConfig } from "../types";

const ROW_ACTION_INLINE_MAX = 2;

export function RowActionsCell({ actions }: { actions: ActionConfig[] }) {
	if (actions.length <= ROW_ACTION_INLINE_MAX) {
		return (
			<div className="flex items-center justify-end gap-1">
				{actions.map((cfg) => (
					<ActionBlock key={cfg.name} options={cfg} meta={{}} />
				))}
			</div>
		);
	}
	return <RowActionsMenu actions={actions} />;
}

function RowActionsMenu({ actions }: { actions: ActionConfig[] }) {
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
					{actions.map((cfg) => (
						<DropdownMenuItem
							key={cfg.name}
							asChild
							onSelect={(e) => e.preventDefault()}
						>
							<div className="w-full">
								<ActionBlock options={cfg} meta={{}} />
							</div>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
