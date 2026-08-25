/**
 * Table filter controls — inline and modal variants,
 * plus the shared per-field renderer.
 */
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { FieldDependencyProvider } from "../../fields/fieldDependencies";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { applyColumnPlacement } from "../../render/columnPlacement";
import { renderDescriptor } from "../../render/renderDescriptor";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ModalShell, type ModalSize } from "../../ui/modal-shell";
import type { StructureNode } from "../types";

/** Tailwind grid-cols classes for filtersFormColumns (1-12). Shared by InlineFilters + ModalFilters. */
const FORM_COLS_CLASS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-4",
	5: "grid-cols-1 sm:grid-cols-5",
	6: "grid-cols-1 sm:grid-cols-6",
	7: "grid-cols-1 sm:grid-cols-7",
	8: "grid-cols-1 sm:grid-cols-8",
	9: "grid-cols-1 sm:grid-cols-9",
	10: "grid-cols-1 sm:grid-cols-10",
	11: "grid-cols-1 sm:grid-cols-11",
	12: "grid-cols-1 sm:grid-cols-12",
};

interface FiltersProps {
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	onFilterChange: (name: string, value: unknown) => void;
	onReset: () => void;
	activeCount: number;
	/** Require an explicit Apply action before filter changes narrow the query. */
	deferred?: boolean;
	onApply?: () => void;
	/** Grid column count for the filters form layout (1-12). */
	formColumns?: number;
	/** Width of the filters modal; only meaningful for ModalFilters. */
	formWidth?: ModalSize;
}

// Shared count badge, used by both inline + modal so the active indicator reads
// the same everywhere.
function FilterBadge({ count }: { count: number }) {
	if (count === 0) {
		return null;
	}
	return (
		<Badge size="counter" className="ml-1" data-testid="filter-badge">
			{count}
		</Badge>
	);
}

export function InlineFilters({
	filters,
	filterValues,
	onFilterChange,
	onReset,
	activeCount,
	deferred,
	onApply,
	formColumns,
}: FiltersProps) {
	const t = useTranslation();
	const initialFilterValues = useRef(filterValues).current;
	const gridClass = formColumns
		? (FORM_COLS_CLASS[formColumns] ?? FORM_COLS_CLASS[1])
		: undefined;
	return (
		<div className="flex items-end gap-2 flex-wrap" data-testid="table-filters-inline">
			<FieldDependencyProvider data={filterValues} initial={initialFilterValues}>
				<div
					className={
						gridClass ? cn("grid gap-2", gridClass) : "flex items-end gap-2 flex-wrap"
					}
				>
					{filters.map((f) =>
						renderFilterField(f, { filterValues, onFilterChange, grid: !!gridClass }),
					)}
				</div>
			</FieldDependencyProvider>
			{deferred && (
				<Button onClick={onApply} data-testid="table-filters-apply">
					{t("table.filters.apply")}
				</Button>
			)}
			{activeCount > 0 && (
				<Button variant="ghost" onClick={onReset}>
					{t("table.filters.reset")}
					<FilterBadge count={activeCount} />
				</Button>
			)}
		</div>
	);
}

export function ModalFilters({
	filters,
	filterValues,
	onFilterChange,
	onReset,
	activeCount,
	deferred,
	onApply,
	formColumns,
	formWidth,
}: FiltersProps) {
	const t = useTranslation();
	const [open, setOpen] = useState(false);
	const initialFilterValues = useRef(filterValues).current;
	const gridClass = formColumns
		? (FORM_COLS_CLASS[formColumns] ?? FORM_COLS_CLASS[1])
		: undefined;

	function handleDone() {
		if (deferred) {
			onApply?.();
		}
		setOpen(false);
	}

	return (
		<>
			<Button
				variant="outline"
				data-testid="table-filters-trigger"
				onClick={() => setOpen(true)}
			>
				{t("table.filters.label")}
				<FilterBadge count={activeCount} />
			</Button>
			<ModalShell
				open={open}
				onOpenChange={setOpen}
				title={t("table.filters.label")}
				size={formWidth}
				footer={
					<div className="flex items-center justify-end gap-2">
						{activeCount > 0 && (
							<Button variant="ghost" onClick={onReset}>
								{t("table.filters.reset")}
							</Button>
						)}
						<Button onClick={handleDone}>{t("table.filters.apply")}</Button>
					</div>
				}
			>
				<FieldDependencyProvider data={filterValues} initial={initialFilterValues}>
					<div
						className={gridClass ? cn("grid gap-4", gridClass) : "flex flex-col gap-4"}
					>
						{filters.map((f) =>
							renderFilterField(f, {
								filterValues,
								onFilterChange,
								grid: !!gridClass,
							}),
						)}
					</div>
				</FieldDependencyProvider>
			</ModalShell>
		</>
	);
}

interface RenderFilterFieldOptions {
	filterValues: Record<string, unknown>;
	onFilterChange: (name: string, value: unknown) => void;
	/** True when the parent lays out filters on a formColumns grid — placed via colSpan/colStart instead of a fixed width. */
	grid?: boolean;
}

export function renderFilterField(node: StructureNode, opts: RenderFilterFieldOptions): ReactNode {
	const { filterValues, onFilterChange, grid = false } = opts;
	const name = node.name ?? "";
	if (!name) {
		return null;
	}
	const descriptor = getBlockDescriptor(node.kind);
	if (!descriptor || descriptor.behavior !== "field") {
		return null;
	}
	const value = filterValues[name] ?? null;
	const options = node.name
		? { name, ...(node.options as Record<string, unknown>) }
		: (node.options as Record<string, unknown>);
	const label = (options as { label?: string }).label;
	const field = (
		<div
			key={grid ? undefined : name}
			className={cn("flex flex-col gap-1.5", !grid && "min-w-48 shrink-0")}
		>
			{label && (
				<label className="text-sm font-medium" htmlFor={`filter-${name}`}>
					{label}
				</label>
			)}
			<div className="flex min-h-9 items-end">
				{renderDescriptor(descriptor, {
					kind: node.kind,
					options,
					meta: node.meta,
					ctx: {
						surface: "form",
						binding: {
							name,
							value,
							onChange: (next) => onFilterChange(name, next),
						},
					},
					children: undefined,
					renderChild: () => null,
				})}
			</div>
		</div>
	);
	if (!grid) {
		return field;
	}
	return <div key={name}>{applyColumnPlacement(field, options)}</div>;
}
