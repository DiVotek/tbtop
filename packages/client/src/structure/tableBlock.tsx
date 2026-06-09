import { type ReactNode, useCallback, useMemo, useState } from "react";
import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
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
	TableColumn,
	TableController,
} from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

interface TableBlockOptions extends AsyncBlock {
	query: (ctx: ClientActionContext) => Promise<unknown[]>;
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
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
	return (
		<TableControllerProvider value={ctrl}>
			<div className="flex flex-col gap-2" data-testid="table-block">
				{hasBulk && <BulkActionsRow actions={props.bulkActions ?? []} />}
				<TableGrid
					rows={props.rows}
					columns={props.columns}
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
						<RowProvider value={props.row}>
							{props.rowActions.map((cfg) => (
								<ActionBlock key={cfg.name} options={cfg} meta={{}} />
							))}
						</RowProvider>
					</div>
				</td>
			)}
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
