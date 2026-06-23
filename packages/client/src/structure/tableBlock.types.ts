/**
 * Shared prop/option shapes + the query-context stub for TableBlock/TableBody.
 * Split out of tableBlock.tsx to keep that file under the size cap.
 */
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
