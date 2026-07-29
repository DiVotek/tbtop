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

function headerAlignClass(align: TableColumn["align"]): string {
	if (align === "center") {
		return "text-center";
	}
	if (align === "right") {
		return "text-right";
	}
	return "text-left";
}

export function SortableHeader({ col, sort, onSort }: SortableHeaderProps) {
	const [currentCol, currentDir] = sort?.split(":") ?? [];
	const isActive = currentCol === col.name;
	const dir = isActive ? (currentDir as "asc" | "desc") : undefined;

	const alignClass = headerAlignClass(col.align);
	const widthStyle = col.width ? { width: col.width } : undefined;

	const HeadingIcon = col.icon ? resolveIcon(col.icon.name) : undefined;

	function handleClick() {
		if (!col.sortable) {
			return;
		}
		if (!isActive || !dir) {
			onSort(col.name, "asc");
		} else if (dir === "asc") {
			onSort(col.name, "desc");
		} else {
			onSort(col.name);
		}
	}

	function resolveAriaSort(): "ascending" | "descending" | "none" | undefined {
		if (isActive) {
			return dir === "asc" ? "ascending" : "descending";
		}
		if (col.sortable) {
			return "none";
		}
		return undefined;
	}

	return (
		<th
			className={cn(
				"whitespace-nowrap px-3 py-2 font-medium transition-colors",
				alignClass,
				col.sortable && "cursor-pointer select-none hover:bg-muted hover:text-foreground",
			)}
			style={widthStyle}
			onClick={col.sortable ? handleClick : undefined}
			aria-sort={resolveAriaSort()}
		>
			<HeaderTooltip tooltip={col.tooltip}>
				<SortTrigger sortable={col.sortable}>
					{HeadingIcon && col.icon?.position !== "right" && (
						<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
					)}
					{col.label ?? col.name}
					{HeadingIcon && col.icon?.position === "right" && (
						<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
					)}
					{col.sortable && <SortIndicator active={isActive} dir={dir} />}
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
			className="inline-flex items-center gap-1 rounded-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
