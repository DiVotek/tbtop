/**
 * Footer for a simplePagination() table: previous/next and the per-page
 * selector. The server sends hasMore instead of a total, so there is no
 * range counter and no page-number list.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import type { ListQueryParams, TablePaginationOptions } from "../types";
import { PerPageSelect } from "./pagination";

interface SimplePaginationProps {
	hasMore: boolean;
	queryParams: ListQueryParams;
	paginationOptions: TablePaginationOptions;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
}

export function SimplePagination({
	hasMore,
	queryParams,
	paginationOptions,
	onChangeParams,
}: SimplePaginationProps): ReactNode {
	const t = useTranslation();
	const perPage = queryParams.perPage ?? paginationOptions.perPage ?? 25;
	const page = queryParams.page ?? 1;
	const perPageOptions = paginationOptions.options ?? [10, 25, 50, 100];

	return (
		<div
			className="flex items-center justify-between gap-3 px-1 py-2 text-sm text-muted-foreground"
			data-testid="table-pagination"
		>
			<div className="flex items-center gap-2" data-testid="pagination-pages">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChangeParams({ page: page - 1 })}
					disabled={page <= 1}
					data-testid="pagination-prev"
				>
					<ChevronLeft className="size-4" aria-hidden />
					{t("table.pagination.prev")}
				</Button>
				<span className="whitespace-nowrap px-1" data-testid="pagination-current">
					{t("table.pagination.page").replace("{page}", String(page))}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChangeParams({ page: page + 1 })}
					disabled={!hasMore}
					data-testid="pagination-next"
				>
					{t("table.pagination.next")}
					<ChevronRight className="size-4" aria-hidden />
				</Button>
			</div>

			<PerPageSelect
				perPage={perPage}
				options={perPageOptions}
				onChangeParams={onChangeParams}
			/>
		</div>
	);
}
