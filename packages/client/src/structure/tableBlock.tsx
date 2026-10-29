import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionBlock } from "./actionBlock";
import { useClientActionContext } from "./actionContext";
import { TableSkeleton } from "./defaults";
import { useSetPageSubtitle } from "./pageSubtitleContext";
import { renderAsyncError } from "./renderAsyncError";
import { AsideFilters } from "./table/asideFilters";
import { BulkActionsBar } from "./table/bulkActionsBar";
import { ColumnSizingProvider } from "./table/columnResize";
import { FilterChips } from "./table/filterChips";
import { activeFilters } from "./table/filterChipValue";
import { normalizeRows, TableGrid } from "./table/grid";
import { TablePagination } from "./table/pagination";
import { canReorder } from "./table/reorder";
import { SimplePagination } from "./table/simplePagination";
import { TableError } from "./table/tableError";
import { TableTabBar, TableToolbar, useFilterHandlers } from "./table/toolbar";
import { useColumnLayout } from "./table/useColumnLayout";
import { useColumnSearch } from "./table/useColumnSearch";
import { countActiveFilters, useColumnVisibility } from "./table/useColumnVisibility";
import { useFiltersAside } from "./table/useFiltersAside";
import { useTableParams } from "./table/useTableParams";
import { useTablePoll } from "./table/useTablePoll";
import {
	type SaveCellArgs,
	type TableBlockOptions,
	type TableBodyProps,
	tableQueryStub,
} from "./tableBlock.types";
import { TableControllerProvider, useRegisterTableController } from "./tableContext";
import { useTableController } from "./tableController";
import { persistTableParams, seedTableParams } from "./tableUrlState";
import type { ClientActionContext, ListQueryParams } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

interface TableRenderProps {
	options: TableBlockOptions;
}

export function TableBlock({ options }: TableRenderProps) {
	const tableName = options.name ?? "";
	return <StatefulTableBlock key={tableName} options={options} />;
}

function StatefulTableBlock({ options }: TableRenderProps) {
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

	const { state, refetch, refetchSilently } = useAsyncQuery({
		query: options.query,
		ctx: queryCtx,
		deps: [queryParams],
	});
	const rawSaveCell = options.saveCell;
	const saveCell = useMemo(
		() => (rawSaveCell ? (args: SaveCellArgs) => rawSaveCell(ctx, args) : undefined),
		[rawSaveCell, ctx],
	);
	const rawReorderRows = options.reorderRows;
	const reorderRows = useMemo(
		() => (rawReorderRows ? (ids: string[]) => rawReorderRows(ctx, ids) : undefined),
		[rawReorderRows, ctx],
	);

	if (state.kind === "loading") {
		return <>{options.loading ?? <TableSkeleton />}</>;
	}
	if (state.kind === "error") {
		const fallback = <TableError message={state.message} onRetry={refetch} />;
		return <>{renderAsyncError(options.error, state.message, fallback)}</>;
	}

	const { rows, total, hasMore, tabCounts } = normalizeRows(state.data);

	return (
		<TableBody
			rows={rows}
			total={total}
			hasMore={hasMore}
			isReloading={state.kind === "reloading"}
			columns={options.columns}
			rowActions={options.rowActions}
			bulkActions={options.bulkActions}
			queryParams={queryParams}
			onChangeParams={mergeParams}
			onRefresh={refetch}
			onPoll={refetchSilently}
			poll={options.poll}
			searchable={options.searchable}
			filters={options.filters}
			filtersIn={options.filtersIn ?? "modal"}
			filtersCollapsed={options.filtersCollapsed}
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
			searchInput={options.searchInput}
			columnToggle={options.columnToggle}
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
	useRegisterTableController(props.tableName, ctrl);
	useTablePoll({
		seconds: props.poll,
		paused: ctrl.selectedIds.length > 0,
		poll: props.onPoll,
	});

	const hasBulk = (props.bulkActions ?? []).length > 0;
	const hasRowActions = (props.rowActions ?? []).length > 0;
	const hasSearch = (props.searchable ?? []).length > 0 && props.searchInput !== false;
	const hasFilters = (props.filters ?? []).length > 0;

	const { visibleColumns, toggleColumn } = useColumnVisibility(props.columns, props.tableName);
	const layout = useColumnLayout(props.columns, props.tableName);
	const sizing = useMemo(
		() => ({ widths: layout.widths, setWidth: layout.setWidth }),
		[layout.widths, layout.setWidth],
	);

	// Seed filter UI state from URL-persisted params so controls reflect a pre-set URL.
	const [filterValues, setFilterValues] = useState<Record<string, unknown>>(
		() => props.queryParams.filters ?? {},
	);

	const activeFilterCount = countActiveFilters(filterValues);
	const aside = useFiltersAside(props.columns, props.tableName, props.filtersCollapsed === true);
	const filterHandlers = useFilterHandlers({
		filterValues,
		setFilterValues,
		onChangeParams: props.onChangeParams,
		deferFilters: props.deferFilters,
	});
	const showAside = hasFilters && !props.embedded && props.filtersIn === "aside" && aside.open;
	const hasActiveFilters = activeFilterCount > 0 || Boolean(props.queryParams.search);

	const { colSearchValues, handleColSearchChange } = useColumnSearch(
		props.queryParams.colSearch,
		props.onChangeParams,
	);

	const params = useTableParams(props.onChangeParams, {
		applied: props.queryParams.filters,
		values: filterValues,
		setValues: setFilterValues,
	});
	const { handleResetFilters, handleSort, handleSelectTab } = params;
	// Chips read the applied filters, not the form: a deferred table's pending
	// edits don't narrow the rows until Apply, so they get no chip either.
	const appliedFilters = activeFilters(props.filters ?? [], props.queryParams.filters);

	const tabs = props.tabs ?? [];
	const activeTab = props.queryParams.tab ?? tabs[0]?.name;
	const activeTabDescription = tabs.find((t) => t.name === activeTab)?.description;

	// Surface the active tab's description as the page subtitle; clear it on
	// tab switch (no description) or unmount so a stale line never lingers.
	const setPageSubtitle = useSetPageSubtitle();
	useEffect(() => {
		setPageSubtitle(activeTabDescription);
		return () => setPageSubtitle(undefined);
	}, [activeTabDescription, setPageSubtitle]);

	// Without the Columns menu (embedded, or columnToggle(false)) there is no
	// way to reorder or reset the order, so the declared order holds. Widths
	// still resize there unless embedded: a double-click resets each one.
	const reorderable = !props.embedded && props.columnToggle !== false;
	const orderedCols = reorderable ? layout.orderedColumns : props.columns;
	const visibleCols = orderedCols.filter((c) => visibleColumns.has(c.name));

	// Footer only when the server sends pagination config and a total, the
	// table isn't embedded (embedded tables hide toolbar + pagination footer),
	// and there's more than one page's worth of rows to page through — a
	// first-page result that already fits within perPage has nothing to
	// paginate, so the footer would just show inert controls.
	// A simple-paginated table sends hasMore instead of a total; its footer
	// hides on a first page with no next one, by the same rule.
	const { total, hasMore, pagination } = props;
	const perPage = props.queryParams.perPage ?? pagination?.perPage ?? 25;
	const page = props.queryParams.page ?? 1;
	const fitsOnFirstPage = total !== undefined && total <= perPage && page === 1;
	const showPagination =
		pagination !== undefined && total !== undefined && !props.embedded && !fitsOnFirstPage;
	const showSimplePagination =
		pagination?.simple === true &&
		hasMore !== undefined &&
		!props.embedded &&
		(hasMore || page > 1);

	// Reorder is allowed only while rows are shown in their persisted order —
	// a per-column search narrows the rows just like the table-wide one.
	const hasColumnSearch = Object.values(props.queryParams.colSearch ?? {}).some(Boolean);
	const reorderEnabled = canReorder({
		sort: props.queryParams.sort,
		hasActiveFilters: hasActiveFilters || hasColumnSearch,
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

				<div className="flex items-start gap-4">
					{showAside && (
						<AsideFilters
							filters={props.filters ?? []}
							filterValues={filterValues}
							onFilterChange={filterHandlers.handleFilterChange}
							onReset={filterHandlers.handleReset}
							activeCount={activeFilterCount}
							deferred={props.deferFilters}
							onApply={filterHandlers.handleApply}
						/>
					)}
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						{!props.embedded && (
							<TableToolbar
								hasSearch={hasSearch}
								hasFilters={hasFilters}
								filtersIn={props.filtersIn}
								filters={props.filters ?? []}
								filterValues={filterValues}
								setFilterValues={setFilterValues}
								activeFilterCount={activeFilterCount}
								columns={layout.orderedColumns}
								visibleColumns={visibleColumns}
								onToggleColumn={toggleColumn}
								onMoveColumn={layout.moveColumn}
								onResetLayout={layout.customized ? layout.resetLayout : undefined}
								onChangeParams={props.onChangeParams}
								searchValue={props.queryParams.search}
								searchPlaceholder={props.searchPlaceholder}
								deferFilters={props.deferFilters}
								filtersFormColumns={props.filtersFormColumns}
								filtersFormWidth={props.filtersFormWidth}
								columnToggle={props.columnToggle}
								asideOpen={aside.open}
								onToggleAside={aside.toggle}
							/>
						)}
						{!props.embedded && (
							<FilterChips
								filters={appliedFilters}
								onRemove={params.handleRemoveFilter}
								onClear={params.handleClearFilters}
							/>
						)}

						{hasBulk && (
							<BulkActionsBar
								actions={props.bulkActions ?? []}
								selectedCount={ctrl.selectedIds.length}
							/>
						)}

						{/* Embedded tables have no toolbar to reset from, so they don't resize. */}
						<ColumnSizingProvider value={props.embedded ? undefined : sizing}>
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
						</ColumnSizingProvider>
					</div>
				</div>

				{showSimplePagination && (
					<SimplePagination
						hasMore={hasMore}
						queryParams={props.queryParams}
						paginationOptions={pagination}
						onChangeParams={props.onChangeParams}
					/>
				)}

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
