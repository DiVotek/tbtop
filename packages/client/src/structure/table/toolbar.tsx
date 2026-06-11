/**
 * TableToolbar — search input, filter panel, column visibility dropdown.
 * Extracted from tableBlock.tsx.
 */
import { type ReactNode, useCallback, useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { Button } from "../../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Input } from "../../ui/input";
import { ModalShell } from "../../ui/modal-shell";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import type { ListQueryParams, StructureNode, TableColumn, TableTab } from "../types";

// ─── Toolbar ─────────────────────────────────────────────────────────────────

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
			pushFilters(next);
		},
		[filterValues, setFilterValues, pushFilters],
	);

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
					placeholder={t("table.search.placeholder")}
					className="max-w-xs"
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
				/>
			)}
			{hasFilters && filtersIn === "modal" && (
				<ModalFilters
					filters={filters}
					filterValues={filterValues}
					onFilterChange={handleFilterChange}
					onReset={handleReset}
					activeCount={activeFilterCount}
				/>
			)}
			<ColumnVisibilityDropdown
				columns={dropdownCols}
				visibleColumns={visibleColumns}
				onToggle={onToggleColumn}
			/>
		</div>
	);
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

interface TableTabBarProps {
	tabs: TableTab[];
	/** Active tab name; the first declared tab when no param is set. */
	activeTab: string | undefined;
	tabCounts?: Record<string, number>;
	onSelect: (name: string) => void;
}

export function TableTabBar({ tabs, activeTab, tabCounts, onSelect }: TableTabBarProps) {
	return (
		<Tabs value={activeTab} onValueChange={onSelect}>
			<TabsList data-testid="table-tabs">
				{tabs.map((tab) => (
					<TabsTrigger
						key={tab.name}
						value={tab.name}
						data-testid={`table-tab-${tab.name}`}
					>
						{tab.label}
						{tab.count && tabCounts?.[tab.name] !== undefined && (
							<span
								className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] tabular-nums"
								data-testid={`table-tab-count-${tab.name}`}
							>
								{tabCounts[tab.name]}
							</span>
						)}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

// ─── Filters ─────────────────────────────────────────────────────────────────

interface FiltersProps {
	filters: StructureNode[];
	filterValues: Record<string, unknown>;
	onFilterChange: (name: string, value: unknown) => void;
	onReset: () => void;
	activeCount: number;
}

function InlineFilters({
	filters,
	filterValues,
	onFilterChange,
	onReset,
	activeCount,
}: FiltersProps) {
	const t = useTranslation();
	return (
		<div className="flex flex-col gap-2 w-full" data-testid="table-filters-inline">
			<div className="flex items-center gap-2 flex-wrap">
				{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
				{activeCount > 0 && (
					<Button variant="ghost" size="sm" onClick={onReset}>
						{t("table.filters.reset")}
					</Button>
				)}
			</div>
			{activeCount > 0 && (
				<span className="text-xs text-muted-foreground" data-testid="filter-badge">
					{activeCount}
				</span>
			)}
		</div>
	);
}

function ModalFilters({
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
				{activeCount > 0 && (
					<span
						className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
						data-testid="filter-badge"
					>
						{activeCount}
					</span>
				)}
			</Button>
			<ModalShell
				open={open}
				onOpenChange={setOpen}
				title={t("table.filters.label")}
				footer={
					activeCount > 0 ? (
						<Button variant="outline" onClick={onReset}>
							{t("table.filters.reset")}
						</Button>
					) : undefined
				}
			>
				<div className="flex flex-col gap-4">
					{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
				</div>
			</ModalShell>
		</>
	);
}

function renderFilterField(
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

// ─── Column visibility dropdown ───────────────────────────────────────────────

interface ColumnVisibilityProps {
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggle: (name: string) => void;
}

function ColumnVisibilityDropdown({ columns, visibleColumns, onToggle }: ColumnVisibilityProps) {
	const t = useTranslation();
	return (
		<div data-testid="column-visibility">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" data-testid="column-visibility-trigger">
						{t("table.columns.label")}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{columns.map((col) => (
						<DropdownMenuCheckboxItem
							key={col.name}
							checked={visibleColumns.has(col.name)}
							onCheckedChange={() => onToggle(col.name)}
							data-testid={`column-toggle-${col.name}`}
						>
							{col.label ?? col.name}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
