/**
 * Body of an ExportAction's modal (client-only kind "tableExport"): tick
 * columns, pick a format and — with a selection — selected vs all matching
 * rows, then download. The server applies the table's filters, search and
 * sort, so the file holds what the table shows.
 */
import { useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { useClientActionContext } from "../actionContext";
import { useNearestModal } from "../modalContext";
import { useNearestTableController } from "../tableContext";
import { defaultTicked, type ExportColumn, exportColumns, useExportChoice } from "./exportChoice";
import { runExport } from "./exportRequest";
import { type TableExportTarget, useTableExportTarget } from "./tableExportContext";
import { useColumnVisibility } from "./useColumnVisibility";

export interface TableExportOptions {
	action: string;
	formats?: string[];
	maxRows?: number;
	filename?: string;
}

export function TableExportBlock({ options }: { options: TableExportOptions }) {
	const target = useTableExportTarget();
	if (!target) {
		return null;
	}
	return <ExportDialog target={target} options={options} />;
}

function ExportDialog({
	target,
	options,
}: {
	target: TableExportTarget;
	options: TableExportOptions;
}) {
	const t = useTranslation();
	const ctx = useClientActionContext();
	const modal = useNearestModal();
	const table = useNearestTableController();
	const formats = options.formats ?? ["csv"];
	const available = exportColumns(target.columns);
	const { visibleColumns } = useColumnVisibility(target.columns, target.tableName);
	const ticked = defaultTicked(target.columns, visibleColumns);
	const [choice, setChoice] = useExportChoice({ ...target, available, ticked, formats });
	// Every matching row picked is the same rows as "all": export them that way.
	const selected = table?.allMatching ? [] : (table?.selectedIds ?? []);
	const [scope, setScope] = useState<"selected" | "all">(
		selected.length > 0 ? "selected" : "all",
	);
	const [busy, setBusy] = useState(false);

	const download = async () => {
		setBusy(true);
		try {
			await runExport(ctx, {
				url: target.exportUrl(options.action),
				format: choice.format,
				columns: available
					.filter((c) => choice.columns.includes(c.name))
					.map((c) => c.name),
				ids: scope === "selected" && selected.length > 0 ? selected : undefined,
				fallbackName: `${options.filename ?? target.tableName}.${choice.format}`,
			});
			modal?.close();
		} catch (error) {
			const message = (error as { message?: string })?.message ?? t("table.export.failed");
			modal?.halt?.(message, "error");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex flex-col gap-5" data-testid="table-export">
			<ColumnPicker
				available={available}
				picked={choice.columns}
				onChange={(columns) => setChoice({ ...choice, columns })}
			/>
			{formats.length > 1 && (
				<Choice
					label={t("table.export.format")}
					name="format"
					value={choice.format}
					onChange={(format) => setChoice({ ...choice, format })}
					options={formats.map((f) => ({ value: f, label: f.toUpperCase() }))}
				/>
			)}
			{selected.length > 0 && (
				<Choice
					label={t("table.export.rows")}
					name="scope"
					value={scope}
					onChange={(v) => setScope(v === "selected" ? "selected" : "all")}
					options={[
						{
							value: "selected",
							label: count(t("table.export.selected_rows"), selected.length),
						},
						{ value: "all", label: allRowsLabel(t, table?.total) },
					]}
				/>
			)}
			{choice.columns.length === 0 && (
				<p className="text-sm text-muted-foreground">{t("table.export.no_columns")}</p>
			)}
			<div className="flex justify-end">
				<Button
					type="button"
					disabled={busy || choice.columns.length === 0}
					onClick={download}
					data-testid="table-export-download"
				>
					{t("table.export.download")}
				</Button>
			</div>
		</div>
	);
}

function count(template: string, n: number): string {
	return template.replace("{count}", n.toLocaleString());
}

function allRowsLabel(t: (key: string) => string, total: number | undefined): string {
	return total === undefined
		? t("table.export.all_rows_unknown")
		: count(t("table.export.all_rows"), total);
}

interface PickerProps {
	available: ExportColumn[];
	picked: string[];
	onChange: (picked: string[]) => void;
}

function ColumnPicker({ available, picked, onChange }: PickerProps) {
	const t = useTranslation();
	const all = available.length > 0 && available.every((c) => picked.includes(c.name));
	const state = all || picked.length === 0 ? all : "indeterminate";
	const toggle = (name: string, on: boolean) =>
		onChange(on ? [...picked, name] : picked.filter((n) => n !== name));

	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 text-sm font-medium">{t("table.export.columns")}</legend>
			<Label className="gap-2">
				<Checkbox
					checked={state}
					onCheckedChange={(v) =>
						onChange(v === true ? available.map((c) => c.name) : [])
					}
					data-testid="table-export-all"
				/>
				{t("table.export.select_all")}
			</Label>
			{/* CSS columns fill top to bottom, so the list reads in declared order. */}
			<div className="gap-x-6 sm:columns-2">
				{available.map((col) => (
					<Label key={col.name} className="mb-2 gap-2 font-normal break-inside-avoid">
						<Checkbox
							checked={picked.includes(col.name)}
							onCheckedChange={(v) => toggle(col.name, v === true)}
							data-testid={`table-export-column-${col.name}`}
						/>
						{col.label}
					</Label>
				))}
			</div>
		</fieldset>
	);
}

interface ChoiceProps {
	label: string;
	name: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}

function Choice({ label, name, value, onChange, options }: ChoiceProps) {
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 text-sm font-medium">{label}</legend>
			<RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-4">
				{options.map((o) => (
					<Label key={o.value} className="gap-2 font-normal">
						<RadioGroupItem
							value={o.value}
							data-testid={`table-export-${name}-${o.value}`}
						/>
						{o.label}
					</Label>
				))}
			</RadioGroup>
		</fieldset>
	);
}
