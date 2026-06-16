/**
 * TableRow + cell rendering. Handles row-click arming (pointerdown → click)
 * with DOM-containment + isConnected guards so portal/modal clicks never
 * count as a row click. Extracted from grid.tsx.
 */
import { useRef } from "react";
import { cn } from "../../lib/cn";
import { useClientActionContext } from "../actionContext";
import { RowProvider } from "../rowContext";
import type { ActionConfig, TableColumn } from "../types";
import { readId } from "./normalize";
import { RowActionsCell } from "./rowActions";
import { RowDataCell } from "./tableCell";

type SaveCellArgs = { column: string; id: string; value: unknown };

// Selector for interactive elements that should NOT trigger rowClick.
const INTERACTIVE_SELECTOR = "a, button, input, label, [role='checkbox'], [role='menuitem']";

interface TableRowProps {
	row: Record<string, unknown>;
	columns: TableColumn[];
	rowActions: ActionConfig[];
	selected: boolean;
	onToggle: (id: string) => void;
	hasBulk: boolean;
	hasRowActions: boolean;
	rowClick?: string;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}

export function TableRow(props: TableRowProps) {
	const id = readId(props.row);
	const ctx = useClientActionContext();
	// Armed by pointerdown on the row itself. A click whose pointerdown happened
	// elsewhere (e.g. a confirm-dialog button/overlay that unmounted before click
	// dispatch, retargeting the click to this row) must NOT count as a row click.
	const armedRef = useRef(false);

	const rowClickAction = props.rowClick
		? props.rowActions.find((a) => a.name === props.rowClick)
		: undefined;

	function handleRowPointerDown(e: React.PointerEvent<HTMLTableRowElement>) {
		if (!isDomInsideRow(e)) {
			return;
		}
		armedRef.current = true;
	}

	function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>) {
		const armed = armedRef.current;
		armedRef.current = false;
		if (!props.rowClick || !armed || !isDomInsideRow(e)) {
			return;
		}
		// Ignore clicks whose target left the DOM (portal overlay unmounted before
		// the browser dispatched the click) or that land on interactive elements.
		const target = e.target as Element;
		if (!target.isConnected || target.closest(INTERACTIVE_SELECTOR)) {
			return;
		}
		runRowClick(props, rowClickAction, ctx);
	}

	function handleRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
		if (e.key === "Enter") {
			armedRef.current = true;
			e.currentTarget.click();
		}
	}

	const isClickable = Boolean(props.rowClick);

	return (
		<tr
			className={cn(
				"border-t transition-colors hover:bg-muted/50",
				props.selected && "bg-primary/5",
				isClickable && "cursor-pointer",
			)}
			data-testid={id ? `table-row-${id}` : undefined}
			onPointerDown={isClickable ? handleRowPointerDown : undefined}
			onClick={isClickable ? handleRowClick : undefined}
			onKeyDown={isClickable ? handleRowKeyDown : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			<RowProvider value={props.row}>
				{props.hasBulk && (
					<td className="px-3 py-2">
						<input
							type="checkbox"
							className="size-4 cursor-pointer accent-primary"
							checked={props.selected}
							onChange={() => id && props.onToggle(id)}
							data-testid={id ? `table-select-${id}` : undefined}
						/>
					</td>
				)}
				{props.columns.map((col) => (
					<RowDataCell
						key={col.name}
						col={col}
						row={props.row}
						saveCell={props.saveCell}
					/>
				))}
				{props.hasRowActions && (
					<td className="px-3 py-2">
						<RowActionsCell actions={props.rowActions} />
					</td>
				)}
			</RowProvider>
		</tr>
	);
}

// Row-action modals are React children of the <tr> but live in DOM portals.
// React bubbles portal events through the REACT tree, so clicks inside a modal
// reach these handlers — only events whose target is a real DOM descendant of
// the row may count.
function isDomInsideRow(e: React.SyntheticEvent<HTMLTableRowElement>): boolean {
	return e.currentTarget.contains(e.target as Node);
}

function runRowClick(
	props: TableRowProps,
	rowClickAction: ActionConfig | undefined,
	ctx: ReturnType<typeof useClientActionContext>,
): void {
	if (!rowClickAction) {
		if (process.env.NODE_ENV !== "production") {
			console.warn(
				`[tbtop] rowClick: action "${props.rowClick}" not found in rowActions — click ignored.`,
			);
		}
		return;
	}
	if ("handler" in rowClickAction && rowClickAction.handler) {
		void Promise.resolve(rowClickAction.handler({ ...ctx, row: props.row })).catch(() => {});
	}
}
