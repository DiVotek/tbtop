/**
 * SortableRow — a drag-reorderable TableRow. Calls useSortable for the row id,
 * forwards setNodeRef + transform/transition to the row's <tr>, and renders a
 * leading drag-handle <td> that carries the dnd-kit activator listeners.
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslation } from "../../i18n/i18n";
import type { ActionConfig, TableColumn } from "../types";
import { readId } from "./normalize";
import { TableRow } from "./tableRow";

type SaveCellArgs = { column: string; id: string; value: unknown };

interface SortableRowProps {
	row: Record<string, unknown>;
	columns: TableColumn[];
	rowActions: ActionConfig[];
	selected: boolean;
	onToggle: (id: string) => void;
	hasBulk: boolean;
	hasRowActions: boolean;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}

export function SortableRow(props: SortableRowProps) {
	const t = useTranslation();
	const id = readId(props.row) ?? "";
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
	});

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
	};

	const handle = (
		<td className="w-8 px-2 py-2">
			<button
				type="button"
				className="flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing"
				aria-label={t("table.reorder_handle", "Reorder row")}
				data-testid={`reorder-handle-${id}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" />
			</button>
		</td>
	);

	return (
		<TableRow
			row={props.row}
			columns={props.columns}
			rowActions={props.rowActions}
			selected={props.selected}
			onToggle={props.onToggle}
			hasBulk={props.hasBulk}
			hasRowActions={props.hasRowActions}
			saveCell={props.saveCell}
			dragRef={setNodeRef}
			dragStyle={style}
			leadingCell={handle}
		/>
	);
}
