/**
 * Table filter controls — inline and modal variants,
 * plus the shared per-field renderer.
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { Button } from "../../ui/button";
import { ModalShell } from "../../ui/modal-shell";
import type { StructureNode } from "../types";

interface FiltersProps {
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	onFilterChange: (name: string, value: unknown) => void;
	onReset: () => void;
	activeCount: number;
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
}: FiltersProps) {
	const t = useTranslation();
	return (
		<div className="flex items-center gap-2 flex-wrap" data-testid="table-filters-inline">
			{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
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
}: FiltersProps) {
	const t = useTranslation();
	const [open, setOpen] = useState(false);
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
				footer={
					<div className="flex items-center justify-end gap-2">
						{activeCount > 0 && (
							<Button variant="ghost" onClick={onReset}>
								{t("table.filters.reset")}
							</Button>
						)}
						<Button onClick={() => setOpen(false)}>{t("table.filters.apply")}</Button>
					</div>
				}
			>
				<div className="flex flex-col gap-4">
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
