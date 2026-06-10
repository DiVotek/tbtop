import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ActionBlock } from "./actionBlock";
import { useClientActionContext } from "./actionContext";
import type { AsyncBlock } from "./asyncBlock";
import { TableError, TableSkeleton } from "./defaults";
import { renderAsyncError } from "./renderAsyncError";
import { RowProvider } from "./rowContext";
import { TableControllerProvider } from "./tableContext";
import { useTableController } from "./tableController";
import type {
	ActionConfig,
	ClientActionContext,
	ListQueryParams,
	StructureNode,
	TableColumn,
	TableController,
} from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

interface TableBlockOptions extends AsyncBlock {
	query: (ctx: ClientActionContext) => Promise<unknown[]>;
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn?: "modal" | "inline";
}

interface TableRenderProps {
	options: TableBlockOptions;
}

export function TableBlock({ options }: TableRenderProps) {
	const ctx = useClientActionContext();
	const [queryParams, setQueryParams] = useState<ListQueryParams>({});
	const mergeParams = useCallback(
		(patch: Partial<ListQueryParams>) => setQueryParams((prev) => ({ ...prev, ...patch })),
		[],
	);
	const queryCtx = useMemo<ClientActionContext>(
		() => ({ ...ctx, table: tableQueryStub(queryParams) }),
		[ctx, queryParams],
	);
	const { state, refetch } = useAsyncQuery({
		query: options.query,
		ctx: queryCtx,
		deps: [queryParams],
	});

	if (state.kind === "loading") {
		return <>{options.loading ?? <TableSkeleton />}</>;
	}
	if (state.kind === "error") {
		const fallback = <TableError message={state.message} />;
		return <>{renderAsyncError(options.error, state.message, fallback)}</>;
	}

	return (
		<TableBody
			rows={normalizeRows(state.data)}
			columns={options.columns}
			rowActions={options.rowActions}
			bulkActions={options.bulkActions}
			queryParams={queryParams}
			onChangeParams={mergeParams}
			onRefresh={refetch}
			searchable={options.searchable}
			filters={options.filters}
			filtersIn={options.filtersIn ?? "modal"}
		/>
	);
}

function tableQueryStub(queryParams: ListQueryParams): TableController {
	return {
		rows: [],
		selectedIds: [],
		queryParams,
		refresh: () => {},
		setQuery: () => {},
	};
}

interface TableBodyProps {
	rows: Record<string, unknown>[];
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
	queryParams: ListQueryParams;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	onRefresh: () => void;
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn: "modal" | "inline";
}

function TableBody(props: TableBodyProps) {
	const ctrl = useTableController({
		rows: props.rows,
		queryParams: props.queryParams,
		onChangeParams: props.onChangeParams,
		onRefresh: props.onRefresh,
	});
	const hasBulk = (props.bulkActions ?? []).length > 0;
	const hasRowActions = (props.rowActions ?? []).length > 0;
	const hasSearch = (props.searchable ?? []).length > 0;
	const hasFilters = (props.filters ?? []).length > 0;
	// Toolbar always visible for column dropdown; search/filters add more controls.
	const showToolbar = true;

	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
		() => new Set(props.columns.map((c) => c.name)),
	);
	const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});

	const tableId = props.columns.map((c) => c.name).join("-");

	// Restore column visibility from localStorage
	useEffect(() => {
		try {
			const stored = localStorage.getItem(`tbtop.table.${tableId}.columns`);
			if (stored) {
				setVisibleColumns(new Set(JSON.parse(stored) as string[]));
			}
		} catch {
			// Ignore storage errors
		}
	}, [tableId]);

	const toggleColumn = useCallback(
		(name: string) => {
			setVisibleColumns((prev) => {
				const next = new Set(prev);
				if (next.has(name)) {
					next.delete(name);
				} else {
					next.add(name);
				}
				try {
					localStorage.setItem(
						`tbtop.table.${tableId}.columns`,
						JSON.stringify([...next]),
					);
				} catch {
					// Ignore storage errors
				}
				return next;
			});
		},
		[tableId],
	);

	const activeFilterCount = Object.values(filterValues).filter((v) => {
		if (v === null || v === undefined || v === "") {
			return false;
		}
		if (Array.isArray(v)) {
			return v.length > 0;
		}
		if (typeof v === "object") {
			const obj = v as Record<string, unknown>;
			return Boolean(obj.from) || Boolean(obj.to);
		}
		return true;
	}).length;

	const visibleCols = props.columns.filter((c) => visibleColumns.has(c.name));

	return (
		<TableControllerProvider value={ctrl}>
			<div className="flex flex-col gap-2" data-testid="table-block">
				{showToolbar && (
					<TableToolbar
						hasSearch={hasSearch}
						hasFilters={hasFilters}
						filtersIn={props.filtersIn}
						filters={props.filters ?? []}
						filterValues={filterValues}
						setFilterValues={setFilterValues}
						activeFilterCount={activeFilterCount}
						columns={props.columns}
						visibleColumns={visibleColumns}
						onToggleColumn={toggleColumn}
						onChangeParams={props.onChangeParams}
					/>
				)}
				{hasBulk && <BulkActionsRow actions={props.bulkActions ?? []} />}
				<TableGrid
					rows={props.rows}
					columns={visibleCols}
					rowActions={props.rowActions ?? []}
					selectedIds={ctrl.selectedIds}
					onToggle={ctrl.toggleSelection}
					hasBulk={hasBulk}
					hasRowActions={hasRowActions}
				/>
			</div>
		</TableControllerProvider>
	);
}

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

function TableToolbar(props: TableToolbarProps) {
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

	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSearchChange = useCallback(
		(value: string) => {
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current);
			}
			searchTimerRef.current = setTimeout(() => {
				onChangeParams({ search: value || undefined });
			}, 300);
		},
		[onChangeParams],
	);

	const handleFilterChange = useCallback(
		(name: string, value: unknown) => {
			const next = { ...filterValues, [name]: value };
			setFilterValues(next);
			if (filterTimerRef.current) {
				clearTimeout(filterTimerRef.current);
			}
			filterTimerRef.current = setTimeout(() => {
				onChangeParams({ filters: next });
			}, 300);
		},
		[filterValues, setFilterValues, onChangeParams],
	);

	const handleReset = useCallback(() => {
		setFilterValues({});
		onChangeParams({ filters: {}, search: undefined });
	}, [setFilterValues, onChangeParams]);

	return (
		<div className="flex items-center gap-2 flex-wrap" data-testid="table-toolbar">
			{hasSearch && (
				<Input
					type="search"
					placeholder="Search…"
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
				columns={columns}
				visibleColumns={visibleColumns}
				onToggle={onToggleColumn}
			/>
		</div>
	);
}

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
	return (
		<div className="flex flex-col gap-2 w-full" data-testid="table-filters-inline">
			<div className="flex items-center gap-2 flex-wrap">
				{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
				{activeCount > 0 && (
					<Button variant="ghost" size="sm" onClick={onReset}>
						Reset
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
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" data-testid="table-filters-trigger">
					Filters
					{activeCount > 0 && (
						<span
							className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
							data-testid="filter-badge"
						>
							{activeCount}
						</span>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Filters</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{filters.map((f) => renderFilterField(f, filterValues, onFilterChange))}
				</div>
				<DialogFooter>
					{activeCount > 0 && (
						<Button variant="outline" onClick={onReset}>
							Reset
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
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

interface ColumnVisibilityProps {
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggle: (name: string) => void;
}

function ColumnVisibilityDropdown({ columns, visibleColumns, onToggle }: ColumnVisibilityProps) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative" data-testid="column-visibility">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen((v) => !v)}
				data-testid="column-visibility-trigger"
			>
				Columns
			</Button>
			{open && (
				<div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-md border bg-popover shadow-md">
					{columns.map((col) => (
						<label
							key={col.name}
							className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
							data-testid={`column-toggle-${col.name}`}
						>
							<input
								type="checkbox"
								checked={visibleColumns.has(col.name)}
								onChange={() => onToggle(col.name)}
							/>
							{col.label ?? col.name}
						</label>
					))}
				</div>
			)}
		</div>
	);
}

function BulkActionsRow({ actions }: { actions: ActionConfig[] }) {
	return (
		<div className="flex gap-2" data-testid="table-bulk-actions">
			{actions.map((cfg) => (
				<ActionBlock key={cfg.name} options={cfg} meta={{}} />
			))}
		</div>
	);
}

interface TableGridProps {
	rows: Record<string, unknown>[];
	columns: TableColumn[];
	rowActions: ActionConfig[];
	selectedIds: string[];
	onToggle: (id: string) => void;
	hasBulk: boolean;
	hasRowActions: boolean;
}

function TableGrid(props: TableGridProps) {
	return (
		<div className="overflow-hidden rounded-md border">
			<table className="w-full text-sm">
				<thead className="bg-muted/50 text-left">
					<tr>
						{props.hasBulk && <th className="w-8" />}
						{props.columns.map((col) => (
							<th key={col.name} className="px-3 py-2 font-medium">
								{col.label ?? col.name}
							</th>
						))}
						{props.hasRowActions && <th className="px-3 py-2" />}
					</tr>
				</thead>
				<tbody>
					{props.rows.map((row, ri) => (
						<TableRow
							key={readId(row) ?? `row-${ri}`}
							row={row}
							columns={props.columns}
							rowActions={props.rowActions}
							selected={isSelected(props.selectedIds, row)}
							onToggle={props.onToggle}
							hasBulk={props.hasBulk}
							hasRowActions={props.hasRowActions}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface TableRowProps {
	row: Record<string, unknown>;
	columns: TableColumn[];
	rowActions: ActionConfig[];
	selected: boolean;
	onToggle: (id: string) => void;
	hasBulk: boolean;
	hasRowActions: boolean;
}

function TableRow(props: TableRowProps) {
	const id = readId(props.row);
	return (
		<tr className="border-t" data-testid={id ? `table-row-${id}` : undefined}>
			{/* Row context feeds kind-cells (upload thumbs) and row actions. */}
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
				{props.columns.map((col) => (
					<td key={col.name} className="px-3 py-2">
						{renderCell(col, props.row)}
					</td>
				))}
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

function renderCell(col: TableColumn, row: Record<string, unknown>): ReactNode {
	if (col.render) {
		return col.render(row);
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

function isSelected(selectedIds: string[], row: Record<string, unknown>): boolean {
	const id = readId(row);
	return id ? selectedIds.includes(id) : false;
}

function normalizeRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) {
		return data as Record<string, unknown>[];
	}
	if (data && typeof data === "object") {
		const obj = data as { data?: unknown };
		if (Array.isArray(obj.data)) {
			return obj.data as Record<string, unknown>[];
		}
	}
	return [];
}

function readId(row: Record<string, unknown>): string | undefined {
	const id = row.id;
	if (typeof id === "string") {
		return id;
	}
	if (typeof id === "number" && Number.isFinite(id)) {
		return String(id);
	}
	return undefined;
}
