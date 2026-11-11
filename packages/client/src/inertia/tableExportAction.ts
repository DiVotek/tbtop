type Bag = Record<string, unknown>;

/**
 * ExportAction ships as a custom action with this built-in handler; it opens
 * the client-only "tableExport" dialog instead of running a registered handler.
 */
const TABLE_EXPORT_HANDLER = "tbtop.export";

export function isTableExport(spec: { type: string; handler?: string }): boolean {
	return spec.type === "custom" && spec.handler === TABLE_EXPORT_HANDLER;
}

export function tableExportModal(name: string, base: Bag, params: Bag | undefined): Bag {
	return {
		title: typeof base.label === "string" ? base.label : name,
		body: { kind: "tableExport", options: { ...params, action: name }, meta: {} },
	};
}
