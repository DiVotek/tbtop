/**
 * SortableHeader + SortIndicator — a column <th> with click-to-sort
 * cycling (asc → desc → clear), aria-sort, and a sort glyph.
 */
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import type { TableColumn } from "../types";
import { resolveIcon } from "./iconRegistry";

interface SortableHeaderProps {
	col: TableColumn;
	sort?: string;
	onSort: (col: string, dir?: "asc" | "desc") => void;
}

// New-gen shape: padding, height, weight, nowrap and text colour come from
// `cn-table-head` (`ui/presets/style-preset-*.css`). The preset pins
// `text-left`; the center/right utilities below override it.
// Our deltas: sortable hover tint + pointer, `aria-sort`, per-column width,
// and the sort button's focus ring (the preset styles no inner trigger).
function headerAlignClass(align: TableColumn["align"]): string | undefined {
	if (align === "center") {
		return "text-center";
	}
	if (align === "right") {
		return "text-right";
	}
	return undefined;
}

/**
 * The field a header sorts by: the column itself, or — for a group, which has
 * no value of its own — its first sortable child.
 */
function resolveSortKey(col: TableColumn): string | undefined {
	if (col.columns && col.columns.length > 0) {
		return col.columns.find((child) => child.sortable)?.name;
	}
	return col.sortable ? col.name : undefined;
}

export function SortableHeader({ col, sort, onSort }: SortableHeaderProps) {
	const [currentCol, currentDir] = sort?.split(":") ?? [];
	const sortKey = resolveSortKey(col);
	const sortable = sortKey !== undefined;
	const isActive = sortable && currentCol === sortKey;
	const dir = isActive ? (currentDir as "asc" | "desc") : undefined;

	const alignClass = headerAlignClass(col.align);
	const widthStyle = col.width ? { width: col.width } : undefined;

	const HeadingIcon = col.icon ? resolveIcon(col.icon.name) : undefined;

	function handleClick() {
		if (sortKey === undefined) {
			return;
		}
		if (!isActive || !dir) {
			onSort(sortKey, "asc");
		} else if (dir === "asc") {
			onSort(sortKey, "desc");
		} else {
			onSort(sortKey);
		}
	}

	function resolveAriaSort(): "ascending" | "descending" | "none" | undefined {
		if (isActive) {
			return dir === "asc" ? "ascending" : "descending";
		}
		if (sortable) {
			return "none";
		}
		return undefined;
	}

	return (
		<th
			className={cn(
				"cn-table-head transition-colors",
				alignClass,
				sortable && "cursor-pointer select-none hover:bg-muted",
			)}
			style={widthStyle}
			onClick={sortable ? handleClick : undefined}
			aria-sort={resolveAriaSort()}
		>
			<HeaderTooltip tooltip={col.tooltip}>
				<SortTrigger sortable={sortable}>
					{HeadingIcon && col.icon?.position !== "right" && (
						<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
					)}
					{col.label ?? col.name}
					{HeadingIcon && col.icon?.position === "right" && (
						<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
					)}
					{sortable && <SortIndicator active={isActive} dir={dir} />}
				</SortTrigger>
			</HeaderTooltip>
		</th>
	);
}

/**
 * A sortable column needs a real focusable element, otherwise it is reachable
 * only by mouse. Non-sortable headers stay plain text — a button there would be
 * an empty tab stop.
 */
function SortTrigger({ sortable, children }: { sortable?: boolean; children: ReactNode }) {
	if (!sortable) {
		return <>{children}</>;
	}
	return (
		<button
			type="button"
			// The <th> owns activation so the whole cell stays clickable, and a click
			// here bubbles up to it. This element exists to be a tab stop: it adds
			// the keyboard path without a second handler that would sort twice.
			className="inline-flex items-center gap-1 rounded-surface-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			{children}
		</button>
	);
}

function HeaderTooltip({ tooltip, children }: { tooltip?: string; children: ReactNode }) {
	const label = <span className="inline-flex items-center gap-1">{children}</span>;
	if (!tooltip) {
		return label;
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>{label}</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function SortIndicator({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
	if (!active) {
		return <ChevronsUpDown className="ml-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />;
	}
	const Glyph = dir === "asc" ? ArrowUp : ArrowDown;
	return <Glyph className="ml-0.5 size-3.5 shrink-0" aria-hidden />;
}
