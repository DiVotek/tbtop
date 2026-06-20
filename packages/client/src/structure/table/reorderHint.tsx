/**
 * ReorderHint — a disabled drag grip shown when row reordering is configured
 * but currently blocked by an active sort, filter, or non-default tab.
 */
import { GripVertical } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export function ReorderHint() {
	const t = useTranslation();
	return (
		<div className="absolute right-2 top-2 z-30" data-testid="reorder-disabled-hint">
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex cursor-not-allowed text-muted-foreground/50">
						<GripVertical className="size-4" />
					</span>
				</TooltipTrigger>
				<TooltipContent>
					{t("table.reorder_hint", "Clear sort and filters to reorder")}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
