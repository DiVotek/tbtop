/**
 * SortableHeader + SortIndicator — the <th> for a column, with click-to-sort
 * cycling (asc → desc → clear), aria-sort, and a lucide sort glyph.
 * Extracted from grid.tsx.
 */
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/cn";
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
			title={col.tooltip}
		>
			<span className="inline-flex items-center gap-1">
				{HeadingIcon && col.icon?.position !== "right" && (
					<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
				)}
				{col.label ?? col.name}
				{HeadingIcon && col.icon?.position === "right" && (
					<HeadingIcon className="size-3.5 shrink-0" aria-hidden />
				)}
				{col.sortable && <SortIndicator active={isActive} dir={dir} />}
			</span>
		</th>
	);
}

function SortIndicator({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
	if (!active) {
		return <ChevronsUpDown className="ml-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />;
	}
	const Glyph = dir === "asc" ? ArrowUp : ArrowDown;
	return <Glyph className="ml-0.5 size-3.5 shrink-0" aria-hidden />;
}
