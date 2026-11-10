import type { Row, TableBuilder } from "../../dsl";
import { EXPORT_HANDLER, ExportFormat } from "../../dsl/actions/export";
import { type AdminContext, currentContext, runWithContext } from "../../dsl/context";
import { trans } from "../../i18n";
import { keyOf, type QueryDriver } from "../driver";
import type { Cell } from "../export/cell";
import { exportCells, exportHeaders, resolveExportColumns } from "../export/columns";
import { csvChunks } from "../export/csv";
import { xlsxChunks } from "../export/xlsx";
import { invalid, notFound, phpQuery, unprocessable } from "../http";
import { applyTableState } from "../tableQuery";
import { arg, type Endpoint, type EndpointCtx, requireDriver } from "./types";

const CHUNK = 500;

const CONTENT_TYPES: Record<ExportFormat, string> = {
	csv: "text/csv; charset=UTF-8",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

interface ExportParams {
	formats: ExportFormat[];
	maxRows: number;
	filename?: string;
}

/** The action's params — only for a reachable, authorized ExportAction of this very table. */
function exportParams(ctx: EndpointCtx): { table: TableBuilder; params: ExportParams } {
	const table = ctx.resolved.s.reachableTable(arg(ctx, 0));
	const action = ctx.resolved.s.reachableAction(arg(ctx, 1));
	const spec = action?.getSpec() as { type?: string; handler?: string; params?: unknown } | null;
	if (
		table === null ||
		action === null ||
		spec?.type !== "custom" ||
		spec.handler !== EXPORT_HANDLER ||
		!table.hasHeaderOrBulkAction(action.name)
	) {
		throw notFound("Export not found on this table.");
	}
	return { table, params: spec.params as ExportParams };
}

function pickFormat(requested: unknown, formats: ExportFormat[]): ExportFormat {
	const format = requested === undefined ? formats[0] : requested;
	if (typeof format !== "string" || !(formats as string[]).includes(format)) {
		throw unprocessable(
			trans("export.unknown_format", { format: typeof format === "string" ? format : "" }),
		);
	}
	return format as ExportFormat;
}

/** ids[] narrows the export to a selection, still inside the table's own query. */
function selectionIds(raw: unknown): string[] | null {
	if (raw === undefined) {
		return null;
	}
	if (!Array.isArray(raw) || raw.length === 0) {
		throw invalid({ ids: ["The ids field must be an array."] });
	}
	const bad = raw.findIndex((id) => typeof id !== "string" || id === "");
	if (bad !== -1) {
		throw invalid({ [`ids.${bad}`]: [`The ids.${bad} field must be an integer or a string.`] });
	}
	return raw as string[];
}

/** Rows in chunks, in the table's order with the key as a tiebreak, so no row repeats across pages. */
async function* chunks<Q>(driver: QueryDriver<Q>, query: Q): AsyncGenerator<Row[]> {
	const ordered = driver.orderBy(query, keyOf(driver as QueryDriver), "asc");
	for (let page = 1; ; page++) {
		const rows = await driver.rows(ordered, { page, perPage: CHUNK });
		if (rows.length > 0) {
			yield rows;
		}
		if (rows.length < CHUNK) {
			return;
		}
	}
}

function disposition(filename: string): string {
	const fallback = filename.replaceAll(/[^\x20-\x7E]|[/\\%"]/g, "_");
	const safe = filename.replaceAll(/[/\\]/g, "_");
	return fallback === safe
		? `attachment; filename="${fallback}"`
		: `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Bytes pulled on demand, each step inside the request's context (locale, user). */
function streamOf(source: AsyncIterator<Uint8Array | string>, context: AdminContext) {
	const encoder = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const next = await runWithContext(context, () => source.next());
			if (next.done) {
				controller.close();
				return;
			}
			controller.enqueue(
				typeof next.value === "string" ? encoder.encode(next.value) : next.value,
			);
		},
		async cancel() {
			await source.return?.();
		},
	});
}

/** GET tables/{table}/export/{action}: the table's rows as CSV or XLSX (TableExportController.php). */
const tableExport: Endpoint = {
	method: "GET",
	pattern: ["tables", ":table", "export", ":action"],
	async run(ctx) {
		const { table, params } = exportParams(ctx);
		const query = phpQuery(new URL(ctx.request.url).searchParams);
		const format = pickFormat(query.format, params.formats);
		const base = table.queryClosure();
		if (base === undefined) {
			throw notFound(`Table "${table.name}" has no query on this page.`);
		}
		const driver = requireDriver(ctx.options);
		let scoped = applyTableState({ table, params: query, driver }, base());
		const ids = selectionIds(query.ids);
		if (ids !== null) {
			scoped = driver.where(scoped, { field: keyOf(driver), op: "in", value: ids });
		}
		const count = await driver.count(scoped);
		if (count > params.maxRows) {
			const n = (v: number) => v.toLocaleString("en-US");
			throw unprocessable(
				trans("export.too_many_rows", { count: n(count), max: n(params.maxRows) }),
			);
		}
		const columns = resolveExportColumns(table, query.columns);
		const cells = mapChunks(chunks(driver, scoped), (rows) =>
			exportCells({ table, columns, keyName: keyOf(driver) }, rows),
		);
		const body =
			format === "csv"
				? csvChunks(exportHeaders(columns), cells)
				: xlsxChunks(exportHeaders(columns), cells);
		const name = `${params.filename ?? `${table.name}-${new Date().toISOString().slice(0, 10)}`}.${format}`;
		return new Response(streamOf(body, currentContext()), {
			headers: {
				"content-type": CONTENT_TYPES[format],
				"content-disposition": disposition(name),
				"cache-control": "no-store",
				"x-content-type-options": "nosniff",
			},
		});
	},
};

async function* mapChunks(
	source: AsyncIterable<Row[]>,
	map: (rows: Row[]) => Cell[][],
): AsyncGenerator<Cell[][]> {
	for await (const rows of source) {
		yield map(rows);
	}
}

export const EXPORT_ENDPOINTS = [tableExport];
