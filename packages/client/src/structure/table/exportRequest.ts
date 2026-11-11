import { fetchDownload, saveBlob } from "../../data/download";
import { tableStateSearch } from "../../inertia/tableState";
import type { ClientActionContext } from "../types";

export interface ExportRequest {
	url: string;
	format: string;
	columns: string[];
	/** Set to export the selection instead of every matching row. */
	ids?: string[];
	fallbackName: string;
}

/** The table's current state (no pagination) plus the dialog's pick, as a query string. */
export function exportQuery(ctx: ClientActionContext, req: ExportRequest): string {
	const params = tableStateSearch(ctx);
	params.append("format", req.format);
	for (const column of req.columns) {
		params.append("columns[]", column);
	}
	for (const id of req.ids ?? []) {
		params.append("ids[]", id);
	}
	return `${req.url}?${params.toString()}`;
}

/** Fetch the file and hand it to the browser; throws the server's error. */
export async function runExport(ctx: ClientActionContext, req: ExportRequest): Promise<void> {
	const path = exportQuery(ctx, req);
	const file = ctx.client.download
		? await ctx.client.download(path)
		: await fetchDownload(fetch, path);
	saveBlob(file, req.fallbackName);
}
