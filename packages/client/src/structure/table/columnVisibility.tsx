/**
 * ColumnVisibilityDropdown — toggles which columns the grid shows and sets
 * their order: drag an entry by its grip, or Alt+↑/↓ on a focused entry.
 */
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { TableColumn } from "../types";
import { pinnedRun } from "./useColumnLayout";

interface ColumnVisibilityProps {
	/** Columns in the user's order. */
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggle: (name: string) => void;
	onMove?: (name: string, target: string) => void;
	onReset?: () => void;
}

export function ColumnVisibilityDropdown({
	columns,
	visibleColumns,
	onToggle,
	onMove,
	onReset,
}: ColumnVisibilityProps) {
	const t = useTranslation();
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
	const names = columns.map((c) => c.name);
	// Only the leading sticky run is pinned, matching the column order rules.
	const pinnedCount = pinnedRun(columns).length;

	function handleDragEnd({ active, over }: DragEndEvent) {
		if (over && active.id !== over.id) {
			onMove?.(String(active.id), String(over.id));
		}
	}

	return (
		<div data-testid="column-visibility">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" data-testid="column-visibility-trigger">
						<Columns3 className="size-4" aria-hidden />
						{t("table.columns.label")}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
						modifiers={[restrictToVerticalAxis, restrictToParentElement]}
					>
						<SortableContext items={names} strategy={verticalListSortingStrategy}>
							<div className="relative">
								{columns.map((col, i) => (
									<ColumnEntry
										key={col.name}
										col={col}
										checked={visibleColumns.has(col.name)}
										onToggle={onToggle}
										// Pinned columns lead the table and never move.
										onMove={i < pinnedCount ? undefined : onMove}
										pinned={Boolean(onMove) && i < pinnedCount}
										prev={names[i - 1]}
										next={names[i + 1]}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
					{onReset && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={onReset} data-testid="column-layout-reset">
								<RotateCcw className="size-4" aria-hidden />
								{t("table.columns.reset")}
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

interface ColumnEntryProps {
	col: TableColumn;
	/** A sticky column in a reorderable menu: it stays put. */
	pinned: boolean;
	checked: boolean;
	onToggle: (name: string) => void;
	onMove?: (name: string, target: string) => void;
	/** Neighbours in the menu, the targets of Alt+↑ / Alt+↓. */
	prev?: string;
	next?: string;
}

function ColumnEntry({ col, checked, onToggle, onMove, pinned, prev, next }: ColumnEntryProps) {
	const t = useTranslation();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: col.name,
		disabled: !onMove,
	});
	const label = col.label ?? col.name;
	const hint = onMove ? t("table.columns.reorder").replace("{column}", label) : undefined;

	function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		const target = ({ ArrowUp: prev, ArrowDown: next } as Record<string, string | undefined>)[
			e.key
		];
		if (!e.altKey || !onMove || target === undefined) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const item = e.currentTarget;
		onMove(col.name, target);
		// React may re-insert the moved node, which drops focus; put it back.
		requestAnimationFrame(() => item.focus());
	}

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn(
				"flex items-center",
				isDragging && "relative z-10 rounded-md bg-popover shadow-md",
			)}
			data-testid={`column-entry-${col.name}`}
		>
			<DropdownMenuCheckboxItem
				className="flex-1"
				checked={checked}
				onCheckedChange={() => onToggle(col.name)}
				onKeyDown={handleKeyDown}
				aria-description={hint}
				data-testid={`column-toggle-${col.name}`}
			>
				{label}
			</DropdownMenuCheckboxItem>
			{/* The grip sits beside the item, not in it: a drag ending on the item
			    would otherwise count as a click and toggle the column. */}
			{onMove && (
				<span
					className="flex cursor-grab touch-none px-1 text-muted-foreground active:cursor-grabbing"
					title={hint}
					data-testid={`column-drag-${col.name}`}
					{...attributes}
					{...listeners}
					tabIndex={-1}
					role="presentation"
				>
					<GripVertical className="size-4" aria-hidden />
				</span>
			)}
			{/* A pinned entry keeps the grip's slot so the checks line up. */}
			{!onMove && pinned && <span className="w-6 shrink-0" aria-hidden />}
		</div>
	);
}
