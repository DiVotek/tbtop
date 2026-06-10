/**
 * TableGrid — the <table> element: header (sort, select-all), rows, empty state.
 * Extracted from tableBlock.tsx.
 */
import { type ReactNode } from "react";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { Button } from "../../ui/button";
import { ActionBlock } from "../actionBlock";
import { useClientActionContext } from "../actionContext";
import { RowProvider } from "../rowContext";
import type { ActionConfig, ListQueryParams, TableColumn } from "../types";
import { BadgeCell, BooleanIconCell, IconMapCell } from "./cellHelpers";
import { resolveIcon } from "./iconRegistry";

// ─── TableGrid ────────────────────────────────────────────────────────────────

interface TableGridProps {
	rows: Record<string, unknown>[];
	columns: TableColumn[];
	rowActions: ActionConfig[];
	selectedIds: string[];
	onToggle: (id: string) => void;
	onSelectAll: (ids: string[]) => void;
	onClearSelection: () => void;
	hasBulk: boolean;
	hasRowActions: boolean;
	/** Currently applied sort, e.g. "title:asc" */
	sort?: string;
	onSort: (col: string, dir: "asc" | "desc" | undefined) => void;
	isReloading?: boolean;
	hasActiveFilters: boolean;
	onResetFilters: () => void;
	/** Name of a row action to trigger on row click. */
	rowClick?: string;
}

export function TableGrid(props: TableGridProps) {
	const t = useTranslation();
	const isEmpty = props.rows.length === 0;
	const allIds = props.rows.map((r) => readId(r)).filter((id): id is string => !!id);
	const allSelected = allIds.length > 0 && allIds.every((id) => props.selectedIds.includes(id));
	const someSelected = !allSelected && allIds.some((id) => props.selectedIds.includes(id));

	function handleSelectAll(checked: boolean) {
		if (checked) {
			props.onSelectAll(allIds);
		} else {
			props.onClearSelection();
		}
	}

	return (
		<div className="relative overflow-hidden rounded-md border">
			{/* Reload overlay — keeps previous data visible with dimming */}
			{props.isReloading && (
				<div
					className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 pointer-events-none"
					data-testid="table-reloading-overlay"
				>
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			)}

			<table className="w-full text-sm">
				<thead className="bg-muted/50 text-left">
					<tr>
						{props.hasBulk && (
							<th className="w-8 px-3 py-2">
								<input
									type="checkbox"
									checked={allSelected}
									ref={(el) => {
										if (el) el.indeterminate = someSelected;
									}}
									onChange={(e) => handleSelectAll(e.target.checked)}
									aria-label={t("table.select_all")}
									data-testid="table-select-all"
								/>
							</th>
						)}
						{props.columns.map((col) => (
							<SortableHeader
								key={col.name}
								col={col}
								sort={props.sort}
								onSort={props.onSort}
							/>
						))}
						{props.hasRowActions && <th className="px-3 py-2" />}
					</tr>
				</thead>
				<tbody>
					{isEmpty ? (
						<tr>
							<td
								colSpan={
									props.columns.length +
									(props.hasBulk ? 1 : 0) +
									(props.hasRowActions ? 1 : 0)
								}
							>
								<EmptyState
									hasActiveFilters={props.hasActiveFilters}
									onReset={props.onResetFilters}
								/>
							</td>
						</tr>
					) : (
						props.rows.map((row, ri) => (
							<TableRow
								key={readId(row) ?? `row-${ri}`}
								row={row}
								columns={props.columns}
								rowActions={props.rowActions}
								selected={isSelected(props.selectedIds, row)}
								onToggle={props.onToggle}
								hasBulk={props.hasBulk}
								hasRowActions={props.hasRowActions}
								rowClick={props.rowClick}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

// ─── Sortable header ──────────────────────────────────────────────────────────

interface SortableHeaderProps {
	col: TableColumn;
	sort?: string;
	onSort: (col: string, dir: "asc" | "desc" | undefined) => void;
}

function SortableHeader({ col, sort, onSort }: SortableHeaderProps) {
	const [currentCol, currentDir] = sort?.split(":") ?? [];
	const isActive = currentCol === col.name;
	const dir = isActive ? (currentDir as "asc" | "desc") : undefined;

	const alignClass =
		col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left";
	const widthStyle = col.width ? { width: col.width } : undefined;

	const HeadingIcon = col.icon ? resolveIcon(col.icon.name) : undefined;

	function handleClick() {
		if (!col.sortable) return;
		if (!isActive || !dir) {
			onSort(col.name, "asc");
		} else if (dir === "asc") {
			onSort(col.name, "desc");
		} else {
			onSort(col.name, undefined);
		}
	}

	const ariaSort: "ascending" | "descending" | "none" | undefined = isActive
		? dir === "asc"
			? "ascending"
			: "descending"
		: col.sortable
			? "none"
			: undefined;

	return (
		<th
			className={cn(
				"px-3 py-2 font-medium",
				alignClass,
				col.sortable && "cursor-pointer select-none",
			)}
			style={widthStyle}
			onClick={col.sortable ? handleClick : undefined}
			aria-sort={ariaSort}
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
		return <span className="ml-0.5 opacity-30 text-xs">↕</span>;
	}
	return (
		<span className="ml-0.5 text-xs" aria-hidden>
			{dir === "asc" ? "↑" : "↓"}
		</span>
	);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
	hasActiveFilters,
	onReset,
}: {
	hasActiveFilters: boolean;
	onReset: () => void;
}) {
	const t = useTranslation();
	return (
		<div
			className="flex flex-col items-center gap-3 py-12 text-muted-foreground"
			data-testid="table-empty"
		>
			<span className="text-4xl opacity-30">○</span>
			<p className="text-sm">
				{hasActiveFilters ? t("table.empty.no_results") : t("table.empty.no_records")}
			</p>
			{hasActiveFilters && (
				<Button
					variant="outline"
					size="sm"
					onClick={onReset}
					data-testid="table-empty-reset"
				>
					{t("table.empty.reset")}
				</Button>
			)}
		</div>
	);
}

// ─── TableRow ─────────────────────────────────────────────────────────────────

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
}

function TableRow(props: TableRowProps) {
	const id = readId(props.row);
	const ctx = useClientActionContext();

	const rowClickAction = props.rowClick
		? props.rowActions.find((a) => a.name === props.rowClick)
		: undefined;

	function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>) {
		if (!props.rowClick) return;
		// Ignore clicks that land on or inside interactive elements.
		if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
		if (!rowClickAction) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					`[tbtop] rowClick: action "${props.rowClick}" not found in rowActions — click ignored.`,
				);
			}
			return;
		}
		if ("handler" in rowClickAction && rowClickAction.handler) {
			void Promise.resolve(rowClickAction.handler({ ...ctx, row: props.row })).catch(
				() => {},
			);
		}
	}

	function handleRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
		if (e.key === "Enter") {
			e.currentTarget.click();
		}
	}

	const isClickable = Boolean(props.rowClick);

	return (
		<tr
			className={cn("border-t", isClickable && "cursor-pointer")}
			data-testid={id ? `table-row-${id}` : undefined}
			onClick={isClickable ? handleRowClick : undefined}
			onKeyDown={isClickable ? handleRowKeyDown : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			<RowProvider value={props.row}>
				{props.hasBulk && (
					<td className="px-3 py-2">
						<input
							type="checkbox"
							checked={props.selected}
							onChange={() => id && props.onToggle(id)}
							data-testid={id ? `table-select-${id}` : undefined}
						/>
					</td>
				)}
				{props.columns.map((col) => {
					const alignClass =
						col.align === "center"
							? "text-center"
							: col.align === "right"
								? "text-right"
								: "";
					const wrapClass = col.wrap === false ? "truncate max-w-0" : "";
					return (
						<td
							key={col.name}
							className={cn("px-3 py-2", alignClass, wrapClass)}
							style={col.width ? { width: col.width } : undefined}
							title={col.tooltip}
						>
							{renderCell(col, props.row)}
						</td>
					);
				})}
				{props.hasRowActions && (
					<td className="px-3 py-2">
						<div className="flex justify-end gap-2">
							{props.rowActions.map((cfg) => (
								<ActionBlock key={cfg.name} options={cfg} meta={{}} />
							))}
						</div>
					</td>
				)}
			</RowProvider>
		</tr>
	);
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function renderCell(col: TableColumn, row: Record<string, unknown>): ReactNode {
	if (col.render) {
		return col.render(row);
	}

	// New wire kinds handled before falling through to block registry
	if (col.kind === "badge") {
		return <BadgeCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "boolean") {
		return <BooleanIconCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "icon") {
		return <IconMapCell value={row[col.name]} col={col} />;
	}

	const descriptor = col.kind ? getBlockDescriptor(col.kind) : undefined;
	if (descriptor?.behavior === "field") {
		return renderDescriptor(descriptor, {
			kind: col.kind ?? "",
			options: { name: col.name },
			meta: {},
			ctx: {
				surface: "cell",
				binding: { name: col.name, value: row[col.name], onChange: () => {} },
			},
			children: undefined,
			renderChild: () => null,
		});
	}
	return String(row[col.name] ?? "");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSelected(selectedIds: string[], row: Record<string, unknown>): boolean {
	const id = readId(row);
	return id ? selectedIds.includes(id) : false;
}

export function readId(row: Record<string, unknown>): string | undefined {
	const id = row.id;
	if (typeof id === "string") return id;
	if (typeof id === "number" && Number.isFinite(id)) return String(id);
	return undefined;
}

export function normalizeRows(data: unknown): {
	rows: Record<string, unknown>[];
	total: number | undefined;
} {
	if (Array.isArray(data)) {
		return { rows: data as Record<string, unknown>[], total: undefined };
	}
	if (data && typeof data === "object") {
		const obj = data as { data?: unknown; total?: unknown };
		if (Array.isArray(obj.data)) {
			const total = typeof obj.total === "number" ? obj.total : undefined;
			return { rows: obj.data as Record<string, unknown>[], total };
		}
	}
	return { rows: [], total: undefined };
}

export function parseSortParam(sort?: string): { col: string; dir: "asc" | "desc" } | undefined {
	if (!sort) return undefined;
	const [col, dir] = sort.split(":");
	if (!col) return undefined;
	return { col, dir: dir === "desc" ? "desc" : "asc" };
}
