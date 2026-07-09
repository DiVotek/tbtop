import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionBlock } from "./actionBlock";
import { useClientActionContext } from "./actionContext";
import { TableSkeleton } from "./defaults";
import { renderAsyncError } from "./renderAsyncError";
import { BulkActionsBar } from "./table/bulkActionsBar";
import { normalizeRows, TableGrid } from "./table/grid";
import { TablePagination } from "./table/pagination";
import { canReorder } from "./table/reorder";
import { TableError } from "./table/tableError";
import { TableTabBar, TableToolbar } from "./table/toolbar";
import { useColumnSearch } from "./table/useColumnSearch";
import { countActiveFilters, useColumnVisibility } from "./table/useColumnVisibility";
import { useTableParams } from "./table/useTableParams";
import {
	type SaveCellArgs,
	type TableBlockOptions,
	type TableBodyProps,
	tableQueryStub,
} from "./tableBlock.types";
import { TableControllerProvider } from "./tableContext";
import { useTableController } from "./tableController";
import { persistTableParams, seedTableParams } from "./tableUrlState";
import type { ClientActionContext, ListQueryParams } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

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
	const rawSaveCell = options.saveCell;
	// ctx is stable within a render; rawSaveCell changes only on remount.
	const saveCell = useMemo(
		() => (rawSaveCell ? (args: SaveCellArgs) => rawSaveCell(ctx, args) : undefined),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[rawSaveCell],
	);
	const rawReorderRows = options.reorderRows;
	const reorderRows = useMemo(
		() => (rawReorderRows ? (ids: string[]) => rawReorderRows(ctx, ids) : undefined),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[rawReorderRows],
	);

	if (state.kind === "loading") {
		return <>{options.loading ?? <TableSkeleton />}</>;
	}
	if (state.kind === "error") {
		const fallback = <TableError message={state.message} onRetry={refetch} />;
		return <>{renderAsyncError(options.error, state.message, fallback)}</>;
	}

	const { rows, total, tabCounts } = normalizeRows(state.data);

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
			tabs={options.tabs}
			tabCounts={tabCounts}
			pagination={options.pagination}
			tableName={tableName}
			rowClick={options.rowClick}
			searchPlaceholder={options.searchPlaceholder}
			emptyState={options.emptyState}
			headerActions={options.headerActions}
			recordUrl={options.recordUrl}
			recordUrlNewTab={options.recordUrlNewTab}
			embedded={options.embedded}
			saveCell={saveCell}
			reorderColumn={options.reorder?.column}
			reorderRows={reorderRows}
			groups={options.groups}
			deferFilters={options.deferFilters}
			filtersFormColumns={options.filtersFormColumns}
			filtersFormWidth={options.filtersFormWidth}
		/>
	);
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

	const { visibleColumns, toggleColumn } = useColumnVisibility(props.columns, props.tableName);

	// Seed filter UI state from URL-persisted params so controls reflect a pre-set URL.
	const [filterValues, setFilterValues] = useState<Record<string, unknown>>(
		() => props.queryParams.filters ?? {},
	);

	const activeFilterCount = countActiveFilters(filterValues);
	const hasActiveFilters = activeFilterCount > 0 || Boolean(props.queryParams.search);

	const { colSearchValues, handleColSearchChange } = useColumnSearch(
		props.queryParams.colSearch,
		props.onChangeParams,
	);

	const { handleResetFilters, handleSort, handleSelectTab } = useTableParams(
		props.onChangeParams,
		setFilterValues,
	);

	const tabs = props.tabs ?? [];
	const activeTab = props.queryParams.tab ?? tabs[0]?.name;

	const visibleCols = props.columns.filter((c) => visibleColumns.has(c.name));

	// Footer only when the server sends pagination config and a total, and the
	// table isn't embedded (embedded tables hide toolbar + pagination footer).
	const { total, pagination } = props;
	const showPagination = pagination !== undefined && total !== undefined && !props.embedded;

	// Reorder is allowed only while rows are shown in their persisted order.
	const reorderEnabled = canReorder({
		sort: props.queryParams.sort,
		hasActiveFilters,
		tab: activeTab,
		firstTabName: tabs[0]?.name,
		reorderColumn: props.reorderColumn,
	});

	return (
		<TableControllerProvider value={ctrl}>
			<div className="flex flex-col gap-2" data-testid="table-block">
				{(props.headerActions ?? []).length > 0 && (
					<div className="flex justify-end gap-2" data-testid="table-header-actions">
						{(props.headerActions ?? []).map((action) => (
							<ActionBlock
								key={action.name}
								options={action}
								meta={action.meta ?? {}}
							/>
						))}
					</div>
				)}
				{tabs.length > 0 && (
					<TableTabBar
						tabs={tabs}
						activeTab={activeTab}
						tabCounts={props.tabCounts}
						onSelect={handleSelectTab}
					/>
				)}

				{!props.embedded && (
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
						searchPlaceholder={props.searchPlaceholder}
						deferFilters={props.deferFilters}
						filtersFormColumns={props.filtersFormColumns}
						filtersFormWidth={props.filtersFormWidth}
					/>
				)}

				{hasBulk && (
					<BulkActionsBar
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
					recordUrl={props.recordUrl}
					recordUrlNewTab={props.recordUrlNewTab}
					emptyState={props.emptyState}
					saveCell={props.saveCell}
					reorderColumn={props.reorderColumn}
					reorderEnabled={reorderEnabled}
					reorderRows={props.reorderRows}
					onRefresh={props.onRefresh}
					groups={props.groups}
					colSearchValues={colSearchValues}
					onColSearchChange={handleColSearchChange}
				/>

				{showPagination && (
					<TablePagination
						total={total}
						queryParams={props.queryParams}
						paginationOptions={pagination}
						onChangeParams={props.onChangeParams}
					/>
				)}
			</div>
		</TableControllerProvider>
	);
}
