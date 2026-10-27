/**
 * Table pagination footer: record range counter, page buttons, per-page selector.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import type { ListQueryParams, TablePaginationOptions } from "../types";

interface PaginationProps {
	total: number;
	queryParams: ListQueryParams;
	paginationOptions: TablePaginationOptions;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
}

export function TablePagination({
	total,
	queryParams,
	paginationOptions,
	onChangeParams,
}: PaginationProps): ReactNode {
	const t = useTranslation();
	const perPage = queryParams.perPage ?? paginationOptions.perPage ?? 25;
	const page = queryParams.page ?? 1;
	const totalPages = Math.max(1, Math.ceil(total / perPage));

	const from = Math.min((page - 1) * perPage + 1, total);
	const to = Math.min(page * perPage, total);

	const perPageOptions = paginationOptions.options ?? [10, 25, 50, 100];

	function goTo(p: number) {
		onChangeParams({ page: p });
	}

	const pages = buildPageNumbers(page, totalPages);

	return (
		<div
			className="grid grid-cols-2 items-center gap-3 px-1 py-2 text-sm text-muted-foreground sm:flex sm:justify-between sm:gap-4"
			data-testid="table-pagination"
		>
			{/* Record range counter */}
			<span className="whitespace-nowrap" data-testid="pagination-range">
				{total > 0 ? `${from}–${to} ${t("table.pagination.of")} ${total}` : "0"}
			</span>

			{/* Page buttons */}
			<div
				className="order-first col-span-2 flex items-center justify-center gap-1 sm:order-none"
				data-testid="pagination-pages"
			>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => goTo(page - 1)}
					disabled={page <= 1}
					aria-label={t("table.pagination.prev")}
					data-testid="pagination-prev"
				>
					<ChevronLeft className="size-4" aria-hidden />
				</Button>

				{pages.map((p, i) =>
					p === "..." ? (
						<span key={`ellipsis-${i}`} className="px-1">
							…
						</span>
					) : (
						<Button
							key={p}
							variant={p === page ? "default" : "outline"}
							size="sm"
							aria-current={p === page ? "page" : undefined}
							onClick={() => goTo(p as number)}
							data-testid={`pagination-page-${p}`}
						>
							{p}
						</Button>
					),
				)}

				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => goTo(page + 1)}
					disabled={page >= totalPages}
					aria-label={t("table.pagination.next")}
					data-testid="pagination-next"
				>
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

interface PerPageSelectProps {
	perPage: number;
	options: number[];
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
}

/** Per-page selector; a change goes back to page 1. Shared with the simple footer. */
export function PerPageSelect({ perPage, options, onChangeParams }: PerPageSelectProps): ReactNode {
	const t = useTranslation();
	const perPageLabelId = useId();

	return (
		<div className="flex items-center justify-self-end gap-2 whitespace-nowrap">
			<span id={perPageLabelId}>{t("table.pagination.per_page")}</span>
			<Select
				value={String(perPage)}
				onValueChange={(v) => onChangeParams({ perPage: Number(v), page: 1 })}
			>
				<SelectTrigger
					className="h-8 w-16 text-xs"
					aria-labelledby={perPageLabelId}
					data-testid="pagination-per-page"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((n) => (
						<SelectItem key={n} value={String(n)}>
							{n}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/** Returns a compact page-number list with ellipsis: 1 … 4 5 6 … 12 */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}
	const result: (number | "...")[] = [];
	const add = (n: number | "...") => {
		const last = result.at(-1);
		if (last !== n) {
			result.push(n);
		}
	};

	add(1);
	if (current > 3) {
		add("...");
	}
	for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
		add(p);
	}
	if (current < total - 2) {
		add("...");
	}
	add(total);

	return result;
}
