/**
 * Column summaries (Column::summarize()): one row under the table for the
 * whole query and one at the end of each row group. Values arrive with the
 * rows, already formatted on the server; this only lays them out under
 * their columns, one "label value" line per declared summary.
 */
import type { ReactNode } from "react";
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import type { TableColumn, TableColumnSummary } from "../types";
import type { SummaryValues } from "./normalize";
import { useStickyCell } from "./stickyColumns";

/** True when any visible column, or a child of a group column, declares a summary. */
export function hasSummaries(columns: TableColumn[]): boolean {
	return columns.some(
		(col) =>
			(col.summaries?.length ?? 0) > 0 ||
			(col.columns ?? []).some((c) => (c.summaries?.length ?? 0) > 0),
	);
}

interface SummaryRowProps {
	columns: TableColumn[];
	values: SummaryValues;
	/** Leading utility cells (drag handle, checkbox) to leave blank. */
	leading: { reorder: boolean; bulk: boolean };
	hasRowActions: boolean;
	variant: "footer" | "group";
}

export function SummaryRow(props: SummaryRowProps): ReactNode {
	return (
		<tr
			className={cn(
				"text-xs",
				props.variant === "footer" ? "border-t-2 bg-muted/50 font-medium" : "bg-muted/25",
			)}
			data-testid={props.variant === "footer" ? "table-summary" : "table-group-summary"}
		>
			{props.leading.reorder && <LeadCell cell="reorder" />}
			{props.leading.bulk && <LeadCell cell="bulk" />}
			{props.columns.map((col) => (
				<SummaryCell key={col.name} col={col} values={props.values} />
			))}
			{props.hasRowActions && <td className="cn-table-cell" />}
		</tr>
	);
}

function LeadCell({ cell }: { cell: "reorder" | "bulk" }): ReactNode {
	const pin = useStickyCell(cell);
	return <td className={cn("cn-table-cell", pin.className)} style={pin.style} />;
}

function SummaryCell({ col, values }: { col: TableColumn; values: SummaryValues }): ReactNode {
	const pin = useStickyCell({ column: col.name });
	const leaves = col.kind === "group" ? (col.columns ?? []) : [col];
	return (
		<td
			className={cn("cn-table-cell align-top", alignClass(col.align), pin.className)}
			style={pin.style}
			data-sticky-edge={pin["data-sticky-edge"]}
		>
			{leaves.map((leaf) => (
				<SummaryLines
					key={leaf.name}
					summaries={leaf.summaries ?? []}
					values={values[leaf.name] ?? []}
				/>
			))}
		</td>
	);
}

function SummaryLines(props: { summaries: TableColumnSummary[]; values: unknown[] }): ReactNode {
	const t = useTranslation();
	return props.summaries.map((summary, i) => (
		<div
			// biome-ignore lint/suspicious/noArrayIndexKey: summaries are positional and never reorder
			key={i}
			className="whitespace-nowrap"
		>
			<span className="text-muted-foreground">
				{summary.label ?? t(`table.summary.${summary.type}`)}
			</span>{" "}
			<span className="tabular-nums">{displayValue(props.values[i])}</span>
		</div>
	));
}

function displayValue(value: unknown): string {
	if (value === null || value === undefined || value === "") {
		return "—";
	}
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

function alignClass(align: TableColumn["align"]): string {
	if (align === "center") {
		return "text-center";
	}
	if (align === "right") {
		return "text-right";
	}
	return "";
}
