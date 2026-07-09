/**
 * Shared prop/option shapes + the query-context stub for TableBlock/TableBody.
 * Split out of tableBlock.tsx to keep that file under the size cap.
 */

import type { ModalSize } from "../ui/modal-shell";
import type { AsyncBlock } from "./asyncBlock";
import type {
	ActionConfig,
	ClientActionContext,
	ListQueryParams,
	StructureNode,
	TableColumn,
	TableController,
	TablePaginationOptions,
	TableTab,
} from "./types";

/** Row-grouping config: partitions contiguous rows sharing `column`'s value. */
export interface TableGroupsConfig {
	column: string;
}

export type SaveCellArgs = { column: string; id: string; value: unknown };

export interface TableEmptyState {
	heading?: string;
	description?: string;
	icon?: string;
}

export interface TableBlockOptions extends AsyncBlock {
	/** Server-assigned table name — used to namespace URL query state. */
	name?: string;
	query: (ctx: ClientActionContext) => Promise<unknown>;
	columns: TableColumn[];
	rowActions?: ActionConfig[];
	bulkActions?: ActionConfig[];
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn?: "modal" | "inline";
	tabs?: TableTab[];
	pagination?: TablePaginationOptions;
	rowClick?: string;
	searchPlaceholder?: string;
	emptyState?: TableEmptyState;
	headerActions?: ActionConfig[];
	recordUrl?: boolean;
	recordUrlNewTab?: boolean;
	/** Hides the toolbar (search/filters/column-visibility) and pagination footer. */
	embedded?: boolean;
	/** Require an explicit Apply action before filter changes narrow the query. */
	deferFilters?: boolean;
	/** Grid column count for the filters form layout (1-4). */
	filtersFormColumns?: number;
	/** Width of the filters modal; only meaningful when filtersIn === "modal". */
	filtersFormWidth?: ModalSize;
	/** Partitions contiguous rows sharing a column's value under group headers. */
	groups?: TableGroupsConfig;
	/** Present when the table declares reorderable(); carries the sort column. */
	reorder?: { column: string };
	/** Materialized by materialize.ts — takes actionCtx + args; bound in TableBlock. */
	saveCell?: (ctx: ClientActionContext, args: SaveCellArgs) => Promise<unknown>;
	/** Materialized by materialize.ts — POSTs the new id order; bound in TableBlock. */
	reorderRows?: (ctx: ClientActionContext, ids: string[]) => Promise<unknown>;
}

export interface TableBodyProps {
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
	tabs?: TableTab[];
	tabCounts?: Record<string, number>;
	pagination?: TablePaginationOptions;
	tableName: string;
	rowClick?: string;
	searchPlaceholder?: string;
	emptyState?: TableEmptyState;
	headerActions?: ActionConfig[];
	recordUrl?: boolean;
	recordUrlNewTab?: boolean;
	embedded?: boolean;
	deferFilters?: boolean;
	filtersFormColumns?: number;
	filtersFormWidth?: ModalSize;
	groups?: TableGroupsConfig;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
	/** Reorder column when reorderable() is declared; undefined otherwise. */
	reorderColumn?: string;
	/** POSTs the new id order; bound in TableBlock. */
	reorderRows?: (ids: string[]) => Promise<unknown>;
}

export function tableQueryStub(queryParams: ListQueryParams): TableController {
	return {
		rows: [],
		selectedIds: [],
		queryParams,
		refresh: () => {},
		setQuery: () => {},
	};
}
