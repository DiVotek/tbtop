import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { ActionBlock } from "./actionBlock";
import { useClientActionContext } from "./actionContext";
import type { AsyncBlock } from "./asyncBlock";
import { TableError, TableSkeleton } from "./defaults";
import { renderAsyncError } from "./renderAsyncError";
import { normalizeRows, parseSortParam, TableGrid } from "./table/grid";
import { TablePagination } from "./table/pagination";
import { TableToolbar } from "./table/toolbar";
import { TableControllerProvider } from "./tableContext";
import { useTableController } from "./tableController";
import { persistTableParams, seedTableParams } from "./tableUrlState";
import type {
	ActionConfig,
	ClientActionContext,
	ListQueryParams,
	StructureNode,
	TableColumn,
	TableController,
	TablePaginationOptions,
} from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

interface TableBlockOptions extends AsyncBlock {
	/** Server-assigned table name — used to namespace URL query state. */
	name?: string;
	query: (ctx: ClientActionContext) => Promise<unknown>;
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn?: "modal" | "inline";
	pagination?: TablePaginationOptions;
	rowClick?: string;
}

interface TableRenderProps {
	options: TableBlockOptions;
}

export function TableBlock({ options }: TableRenderProps) {
	const ctx = useClientActionContext();
	const tableName = options.name ?? "";

	const [queryParams, setQueryParams] = useState<ListQueryParams>(() =>
		tableName ? seedTableParams(tableName) : {},
	);

	const mergeParams = useCallback(
		(patch: Partial<ListQueryParams>) => setQueryParams((prev) => ({ ...prev, ...patch })),
		[],
	);

	useEffect(() => {
		if (!tableName) {
			return;
		}
		persistTableParams(tableName, queryParams);
	}, [tableName, queryParams]);

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

	const { rows, total } = normalizeRows(state.data);

	return (
		<TableBody
			rows={rows}
			total={total}
			isReloading={state.kind === "reloading"}
			columns={options.columns}
			rowActions={options.rowActions}
			bulkActions={options.bulkActions}
			queryParams={queryParams}
			onChangeParams={mergeParams}
			onRefresh={refetch}
			searchable={options.searchable}
			filters={options.filters}
			filtersIn={options.filtersIn ?? "modal"}
			pagination={options.pagination}
			tableName={tableName}
			rowClick={options.rowClick}
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
	total: number | undefined;
	isReloading: boolean;
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
	queryParams: ListQueryParams;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	onRefresh: () => void;
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn: "modal" | "inline";
	pagination?: TablePaginationOptions;
	tableName: string;
	rowClick?: string;
}

function TableBody(props: TableBodyProps) {
	const ctrl = useTableController({
		rows: props.rows,
		total: props.total,
		queryParams: props.queryParams,
		onChangeParams: props.onChangeParams,
		onRefresh: props.onRefresh,
	});

	const hasBulk = (props.bulkActions ?? []).length > 0;
	const hasRowActions = (props.rowActions ?? []).length > 0;
	const hasSearch = (props.searchable ?? []).length > 0;
	const hasFilters = (props.filters ?? []).length > 0;

	// localStorage key is now based on table name (falls back to col-join for
	// unnamed tables to preserve backward compat with existing tests).
	const storageKey = props.tableName
		? `tbtop.table.${props.tableName}.columns`
		: `tbtop.table.${props.columns.map((c) => c.name).join("-")}.columns`;

	// Default visibility: hide columns with hiddenByDefault=true.
	const defaultVisible = useMemo(
		() => new Set(props.columns.filter((c) => c.hiddenByDefault !== true).map((c) => c.name)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[storageKey],
	);

	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(defaultVisible);
	// Seed filter UI state from URL-persisted query params so the controls
	// reflect the active filter values when the page loads with a pre-set URL.
	const [filterValues, setFilterValues] = useState<Record<string, unknown>>(
		() => props.queryParams.filters ?? {},
	);

	// Restore column visibility from localStorage
	useEffect(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				setVisibleColumns(new Set(JSON.parse(stored) as string[]));
			}
		} catch {
			// ignore storage errors
		}
	}, [storageKey]);

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
					localStorage.setItem(storageKey, JSON.stringify([...next]));
				} catch {
					// ignore storage errors
				}
				return next;
			});
		},
		[storageKey],
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

	const hasActiveFilters = activeFilterCount > 0 || Boolean(props.queryParams.search);

	const handleResetFilters = useCallback(() => {
		setFilterValues({});
		props.onChangeParams({ filters: {}, search: undefined, page: 1 });
	}, [props.onChangeParams]);

	const handleSort = useCallback(
		(col: string, dir: "asc" | "desc" | undefined) => {
			props.onChangeParams({
				sort: dir ? `${col}:${dir}` : undefined,
				page: 1,
			});
		},
		[props.onChangeParams],
	);

	const visibleCols = props.columns.filter((c) => visibleColumns.has(c.name));

	// Resolve pagination: only show footer when server sends pagination config
	// AND we have a total count from the response.
	const showPagination = props.pagination !== undefined && props.total !== undefined;

	return (
		<TableControllerProvider value={ctrl}>
			<div className="flex flex-col gap-2" data-testid="table-block">
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

				{hasBulk && (
					<BulkActionsRow
						actions={props.bulkActions ?? []}
						selectedCount={ctrl.selectedIds.length}
					/>
				)}

				<TableGrid
					rows={props.rows}
					columns={visibleCols}
					rowActions={props.rowActions ?? []}
					selectedIds={ctrl.selectedIds}
					onToggle={ctrl.toggleSelection}
					onSelectAll={ctrl.selectAll}
					onClearSelection={ctrl.clearSelection}
					hasBulk={hasBulk}
					hasRowActions={hasRowActions}
					sort={props.queryParams.sort}
					onSort={handleSort}
					isReloading={props.isReloading}
					hasActiveFilters={hasActiveFilters}
					onResetFilters={handleResetFilters}
					rowClick={props.rowClick}
				/>

				{showPagination && (
					<TablePagination
						total={props.total!}
						queryParams={props.queryParams}
						paginationOptions={props.pagination!}
						onChangeParams={props.onChangeParams}
					/>
				)}
			</div>
		</TableControllerProvider>
	);
}

function BulkActionsRow({
	actions,
	selectedCount,
}: {
	actions: ActionConfig[];
	selectedCount: number;
}) {
	const t = useTranslation();
	return (
		<div className="flex items-center gap-2" data-testid="table-bulk-actions">
			{actions.map((cfg) => (
				<ActionBlock key={cfg.name} options={cfg} meta={{}} />
			))}
			{selectedCount > 0 && (
				<span className="text-sm text-muted-foreground" data-testid="bulk-selected-count">
					{t("table.selected_count").replace("{count}", String(selectedCount))}
				</span>
			)}
		</div>
	);
}

// Re-export helpers used by existing tests that import from tableBlock
export { normalizeRows, parseSortParam };
