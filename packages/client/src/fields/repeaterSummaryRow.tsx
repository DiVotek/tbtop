import { ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";

interface RepeaterSummaryRowProps {
	index: number;
	itemCount: number;
	minItems: number;
	disabled?: boolean;
	title: string;
	editor: ReactNode;
	onRemove: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

/**
 * A repeater row collapsed to a one-line title; the pencil toggles an
 * inline edit form. Reorder/remove stay reachable while collapsed.
 */
export function RepeaterSummaryRow(props: RepeaterSummaryRowProps) {
	const t = useTranslation();
	const { index, itemCount, minItems, disabled, title } = props;
	const [editing, setEditing] = useState(false);

	return (
		<div className="rounded-md border" data-repeater-item={index}>
			<div className="flex items-center gap-2 p-2">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
					aria-expanded={editing}
					onClick={() => setEditing((prev) => !prev)}
					data-testid="repeater-summary-toggle"
				>
					<ChevronDownIcon
						className={`size-4 shrink-0 text-muted-foreground transition-transform ${
							editing ? "" : "-rotate-90"
						}`}
					/>
					<span className="truncate font-medium">
						{title || t("field.repeater.untitled_item")}
					</span>
				</button>
				<div className="flex shrink-0 gap-1">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.move_up")}
						disabled={disabled || index === 0}
						onClick={props.onMoveUp}
					>
						↑
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.move_down")}
						disabled={disabled || index === itemCount - 1}
						onClick={props.onMoveDown}
					>
						↓
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.edit")}
						aria-pressed={editing}
						disabled={disabled}
						onClick={() => setEditing((prev) => !prev)}
					>
						<PencilIcon className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						aria-label={t("field.repeater.remove")}
						disabled={disabled || itemCount <= minItems}
						onClick={props.onRemove}
						className="text-destructive hover:text-destructive"
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>
			</div>
			{editing && <div className="flex flex-col gap-3 border-t p-3">{props.editor}</div>}
		</div>
	);
}
