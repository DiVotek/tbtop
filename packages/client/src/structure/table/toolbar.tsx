/** TableToolbar — search, filter panel, column-visibility dropdown. */
import { useCallback } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { Input } from "../../ui/input";
import type { ModalSize } from "../../ui/modal-shell";
import { NodeIcon } from "../../ui/node-icon";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import type { ListQueryParams, StructureNode, TableColumn, TableTab } from "../types";
import { ColumnVisibilityDropdown } from "./columnVisibility";
import { InlineFilters, ModalFilters } from "./filters";

interface TableToolbarProps {
	hasSearch: boolean;
	hasFilters: boolean;
	filtersIn: "modal" | "inline";
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	setFilterValues: (vals: Record<string, unknown>) => void;
	activeFilterCount: number;
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggleColumn: (name: string) => void;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	searchPlaceholder?: string;
	/** Require an explicit Apply action before filter changes narrow the query. */
	deferFilters?: boolean;
	/** Grid column count for the filters form layout (1-4). */
	filtersFormColumns?: number;
	/** Width of the filters modal; only meaningful when filtersIn === "modal". */
	filtersFormWidth?: ModalSize;
	/** Hides the column-visibility ("Columns") dropdown. Defaults to shown. */
	columnToggle?: boolean;
}

export function TableToolbar(props: TableToolbarProps) {
	const {
		hasSearch,
		hasFilters,
		filtersIn,
		filters,
		filterValues,
		setFilterValues,
		activeFilterCount,
		columns,
		visibleColumns,
		onToggleColumn,
		onChangeParams,
		deferFilters,
	} = props;
	const t = useTranslation();

	const handleSearchChange = useDebounce(
		useCallback(
			(value: string) => {
				onChangeParams({ search: value || undefined, page: 1 });
			},
			[onChangeParams],
		),
		300,
	);

	// Controls are controlled by filterValues — update it synchronously so the
	// UI reflects the interaction at once; only the refetch is debounced.
	const pushFilters = useDebounce(
		useCallback(
			(next: Record<string, unknown>) => {
				onChangeParams({ filters: next, page: 1 });
			},
			[onChangeParams],
		),
		300,
	);

	const handleFilterChange = useCallback(
		(name: string, value: unknown) => {
			const next = { ...filterValues, [name]: value };
			setFilterValues(next);
			if (!deferFilters) {
				pushFilters(next);
			}
		},
		[filterValues, setFilterValues, pushFilters, deferFilters],
	);

	const handleApply = useCallback(() => {
		onChangeParams({ filters: filterValues, page: 1 });
	}, [filterValues, onChangeParams]);

	const handleReset = useCallback(() => {
		setFilterValues({});
		onChangeParams({ filters: {}, search: undefined, page: 1 });
	}, [setFilterValues, onChangeParams]);

	// Only toggleable columns appear in the dropdown; always show all columns
	// if none are marked toggleable (backward compat with old wire format).
	const toggleableCols = columns.filter((c) => c.toggleable !== false);
	const dropdownCols = toggleableCols.length > 0 ? toggleableCols : columns;

	return (
		<div className="flex items-center gap-2 flex-wrap" data-testid="table-toolbar">
			{hasSearch && (
				<Input
					type="search"
					placeholder={props.searchPlaceholder ?? t("table.search.placeholder")}
					className="w-full sm:max-w-xs"
					data-testid="table-search-input"
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			)}
			{hasFilters && filtersIn === "inline" && (
				<InlineFilters
					filters={filters}
					filterValues={filterValues}
					onFilterChange={handleFilterChange}
					onReset={handleReset}
					activeCount={activeFilterCount}
					deferred={deferFilters}
					onApply={handleApply}
					formColumns={props.filtersFormColumns}
				/>
			)}
			{hasFilters && filtersIn === "modal" && (
				<ModalFilters
					filters={filters}
					filterValues={filterValues}
					onFilterChange={handleFilterChange}
					onReset={handleReset}
					activeCount={activeFilterCount}
					deferred={deferFilters}
					onApply={handleApply}
					formColumns={props.filtersFormColumns}
					formWidth={props.filtersFormWidth}
				/>
			)}
			{props.columnToggle !== false && (
				<ColumnVisibilityDropdown
					columns={dropdownCols}
					visibleColumns={visibleColumns}
					onToggle={onToggleColumn}
				/>
			)}
		</div>
	);
}

interface TableTabBarProps {
	tabs: TableTab[];
	/** Active tab name; the first declared tab when no param is set. */
	activeTab: string | undefined;
	tabCounts?: Record<string, number>;
	onSelect: (name: string) => void;
}

export function TableTabBar({ tabs, activeTab, tabCounts, onSelect }: TableTabBarProps) {
	return (
		<Tabs value={activeTab} onValueChange={onSelect} className="max-w-full overflow-x-auto">
			<TabsList data-testid="table-tabs">
				{tabs.map((tab) => {
					const icon = <NodeIcon icon={tab.icon} className="size-3.5 shrink-0" />;
					const content = (
						<>
							{tab.icon?.position !== "right" && icon}
							{tab.label}
							{tab.icon?.position === "right" && icon}
							{tab.count && tabCounts?.[tab.name] !== undefined && (
								<span
									className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] tabular-nums"
									data-testid={`table-tab-count-${tab.name}`}
								>
									{tabCounts[tab.name]}
								</span>
							)}
						</>
					);

					const trigger = (
						<TabsTrigger
							key={tab.name}
							value={tab.name}
							data-testid={`table-tab-${tab.name}`}
						>
							{content}
						</TabsTrigger>
					);

					if (tab.tooltip) {
						return (
							<Tooltip key={tab.name}>
								<TooltipTrigger asChild>{trigger}</TooltipTrigger>
								<TooltipContent>{tab.tooltip}</TooltipContent>
							</Tooltip>
						);
					}
					return trigger;
				})}
			</TabsList>
		</Tabs>
	);
}
