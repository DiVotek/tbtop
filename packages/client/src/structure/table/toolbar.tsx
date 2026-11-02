/** TableToolbar — search, filter panel, column-visibility dropdown. */
import { SlidersHorizontal } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
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
	filtersIn: "modal" | "inline" | "aside";
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	setFilterValues: (vals: Record<string, unknown>) => void;
	activeFilterCount: number;
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggleColumn: (name: string) => void;
	/** Moves a column to the slot another one holds; columns arrive in the user's order. */
	onMoveColumn: (name: string, target: string) => void;
	/** Clears the saved order and widths; absent while nothing is customized. */
	onResetLayout?: () => void;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	/** Seeds the search input on mount — hydrated from the URL-persisted query param. */
	searchValue?: string;
	searchPlaceholder?: string;
	/** Require an explicit Apply action before filter changes narrow the query. */
	deferFilters?: boolean;
	/** Grid column count for the filters form layout (1-12). */
	filtersFormColumns?: number;
	/** Width of the filters modal; only meaningful when filtersIn === "modal". */
	filtersFormWidth?: ModalSize;
	/** Hides the column-visibility ("Columns") dropdown. Defaults to shown. */
	columnToggle?: boolean;
	/** filtersIn === "aside": whether the side panel is shown, and its toggle. */
	asideOpen?: boolean;
	onToggleAside?: () => void;
}

interface FilterHandlerArgs {
	filterValues: Record<string, unknown>;
	setFilterValues: (vals: Record<string, unknown>) => void;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	deferFilters?: boolean;
}

/** Change / apply / reset handlers shared by the toolbar and the aside panel. */
export function useFilterHandlers({
	filterValues,
	setFilterValues,
	onChangeParams,
	deferFilters,
}: FilterHandlerArgs) {
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

	return { handleFilterChange, handleApply, handleReset };
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

	const { handleFilterChange, handleApply, handleReset } = useFilterHandlers({
		filterValues,
		setFilterValues,
		onChangeParams,
		deferFilters,
	});

	// Only toggleable columns appear in the dropdown; always show all columns
	// if none are marked toggleable (backward compat with old wire format).
	const toggleableCols = columns.filter((c) => c.toggleable !== false);
	const dropdownCols = toggleableCols.length > 0 ? toggleableCols : columns;
	const searchPlaceholder = props.searchPlaceholder ?? t("table.search.placeholder");

	return (
		<div className="flex items-end gap-2 flex-wrap" data-testid="table-toolbar">
			{hasSearch && (
				<Input
					type="search"
					defaultValue={props.searchValue}
					placeholder={searchPlaceholder}
					// A placeholder vanishes on input and is no accessible name on its own.
					aria-label={searchPlaceholder}
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
			{hasFilters && filtersIn !== "inline" && (
				<ModalFilters
					filters={filters}
					filterValues={filterValues}
					onFilterChange={handleFilterChange}
					onReset={handleReset}
					activeCount={activeFilterCount}
					deferred={deferFilters}
					onApply={handleApply}
					formColumns={filtersIn === "modal" ? props.filtersFormColumns : undefined}
					formWidth={filtersIn === "modal" ? props.filtersFormWidth : undefined}
					slideOver={filtersIn !== "modal"}
					// The aside panel shows from lg up; smaller screens get the sheet.
					triggerClassName={filtersIn === "aside" ? "lg:hidden" : undefined}
				/>
			)}
			{hasFilters && filtersIn === "aside" && (
				<Button
					variant={props.asideOpen ? "secondary" : "outline"}
					className="hidden lg:inline-flex"
					aria-pressed={props.asideOpen}
					data-testid="table-filters-aside-toggle"
					onClick={props.onToggleAside}
				>
					<SlidersHorizontal className="size-4" />
					{t("table.filters.label")}
					{activeFilterCount > 0 && (
						<Badge size="counter" className="ml-1">
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			)}
			{props.columnToggle !== false && (
				<div className="ml-auto">
					<ColumnVisibilityDropdown
						columns={dropdownCols}
						visibleColumns={visibleColumns}
						onToggle={onToggleColumn}
						onMove={props.onMoveColumn}
						onReset={props.onResetLayout}
					/>
				</div>
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
								<Badge
									size="counter"
									variant="secondary"
									className="ml-1 bg-muted-foreground/15"
									data-testid={`table-tab-count-${tab.name}`}
								>
									{tabCounts[tab.name]}
								</Badge>
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
