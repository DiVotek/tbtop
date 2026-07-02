/**
 * Table filter controls — inline and modal variants,
 * plus the shared per-field renderer.
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { Button } from "../../ui/button";
import { ModalShell, type ModalSize } from "../../ui/modal-shell";
import type { StructureNode } from "../types";

/** Tailwind grid-cols classes for filtersFormColumns (1-4). */
const FORM_COLS_CLASS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-4",
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
	/** Grid column count for the filters form layout (1-4). */
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
		<span
			className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
			data-testid="filter-badge"
		>
			{count}
		</span>
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
	const gridClass = formColumns
		? (FORM_COLS_CLASS[formColumns] ?? FORM_COLS_CLASS[1])
		: undefined;
	return (
		<div className="flex items-center gap-2 flex-wrap" data-testid="table-filters-inline">
			<div
				className={
					gridClass ? cn("grid gap-2", gridClass) : "flex items-center gap-2 flex-wrap"
				}
			>
				{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
			</div>
			{deferred && (
				<Button size="sm" onClick={onApply} data-testid="table-filters-apply">
					{t("table.filters.apply")}
				</Button>
			)}
			{activeCount > 0 && (
				<Button variant="ghost" size="sm" onClick={onReset}>
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
				size="sm"
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
				<div className={gridClass ? cn("grid gap-4", gridClass) : "flex flex-col gap-4"}>
					{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
				</div>
			</ModalShell>
		</>
	);
}

export function renderFilterField(
	node: StructureNode,
	filterValues: Record<string, unknown>,
	onFilterChange: (name: string, value: unknown) => void,
): ReactNode {
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
	return (
		<div key={name} className="flex flex-col gap-1.5">
			{(options as { label?: string }).label && (
				<label className="text-sm font-medium" htmlFor={`filter-${name}`}>
					{(options as { label?: string }).label}
				</label>
			)}
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
	);
}
