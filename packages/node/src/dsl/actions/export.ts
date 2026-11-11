import { trans } from "../../i18n";
import type { ActionBuilder } from "../action";
import type { S } from "../s";

/** File formats an ExportAction can produce (ExportFormat.php). */
export const ExportFormat = { Csv: "csv", Xlsx: "xlsx" } as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

/** The client handler the export dialog registers under. */
export const EXPORT_HANDLER = "tbtop.export";

export const EXPORT_DEFAULT_MAX_ROWS = 50_000;

export interface ExportActionOptions {
	/** Offered formats, the first preselected. */
	formats?: ExportFormat[];
	/** File name without extension; defaults to the table name and date. */
	filename?: string;
	/** A larger export is refused with a message to narrow it. */
	maxRows?: number;
	name?: string;
}

/**
 * Prebuilt table export (ExportAction.php): a header or bulk action that opens
 * a column picker and downloads the table's rows — filters, search and sort
 * applied, the selection when there is one — as CSV or XLSX. Gate it with
 * .authorize() like any action.
 */
export const ExportAction = {
	make(s: S, opts: ExportActionOptions = {}): ActionBuilder {
		const formats = opts.formats ?? [ExportFormat.Csv, ExportFormat.Xlsx];
		const maxRows = opts.maxRows ?? EXPORT_DEFAULT_MAX_ROWS;
		if (formats.length === 0) {
			throw new Error("ExportAction needs at least one format.");
		}
		if (!Number.isInteger(maxRows) || maxRows < 1) {
			throw new Error("ExportAction maxRows must be at least 1.");
		}
		const params: Record<string, unknown> = { formats, maxRows };
		if (opts.filename !== undefined) {
			params.filename = opts.filename;
		}
		return s
			.action(opts.name ?? "export")
			.label(trans("action.export"))
			.custom(EXPORT_HANDLER, params);
	},
};
