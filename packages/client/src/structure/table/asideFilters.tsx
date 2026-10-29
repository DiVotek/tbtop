/** AsideFilters — filters stacked in a side panel next to the table. */
import { useRef } from "react";
import { FieldDependencyProvider } from "../../fields/fieldDependencies";
import { useTranslation } from "../../i18n/i18n";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import type { StructureNode } from "../types";
import { renderFilterField } from "./filters";

interface AsideFiltersProps {
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	onFilterChange: (name: string, value: unknown) => void;
	onReset: () => void;
	activeCount: number;
	deferred?: boolean;
	onApply?: () => void;
}

export function AsideFilters({
	filters,
	filterValues,
	onFilterChange,
	onReset,
	activeCount,
	deferred,
	onApply,
}: AsideFiltersProps) {
	const t = useTranslation();
	const initialFilterValues = useRef(filterValues).current;
	return (
		<aside
			className="hidden w-64 shrink-0 flex-col gap-4 self-start rounded-lg border bg-card p-4 lg:flex"
			data-testid="table-filters-aside"
		>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">
					{t("table.filters.label")}
					{activeCount > 0 && (
						<Badge size="counter" className="ml-1.5">
							{activeCount}
						</Badge>
					)}
				</h3>
				{activeCount > 0 && (
					<Button variant="ghost" size="sm" onClick={onReset}>
						{t("table.filters.reset")}
					</Button>
				)}
			</div>
			<FieldDependencyProvider data={filterValues} initial={initialFilterValues}>
				<div className="flex flex-col gap-4 [&>div]:min-w-0">
					{filters.map((f) => renderFilterField(f, { filterValues, onFilterChange }))}
				</div>
			</FieldDependencyProvider>
			{deferred && (
				<Button className="w-full" onClick={onApply}>
					{t("table.filters.apply")}
				</Button>
			)}
		</aside>
	);
}
