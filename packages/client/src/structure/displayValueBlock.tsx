import type { ReactNode } from "react";
import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";
import { CopyButton } from "../ui/copyButton";
import type { CopyableConfig } from "./copyable";
import { useModalData } from "./modalDataContext";
import { BadgeCell, BooleanIconCell, IconMapCell } from "./table/cellHelpers";
import type {
	TableColumn,
	TableColumnBadgeOptions,
	TableColumnBooleanOptions,
	TableColumnIconMapEntry,
} from "./types";

interface DisplayValueOptions {
	value: unknown;
	kind?: string;
	badge?: TableColumnBadgeOptions;
	boolean?: TableColumnBooleanOptions;
	iconMap?: Record<string, TableColumnIconMapEntry>;
	copyable?: CopyableConfig;
	/** Resolve the raw value from useModalData()[field] instead of the baked value. */
	field?: string;
}

/** Unwraps a `{ data: record }` envelope the same way formBlock's modal-data path does. */
function recordFromModalData(modalData: unknown): Record<string, unknown> | undefined {
	if (typeof modalData !== "object" || modalData === null) {
		return undefined;
	}
	const obj = modalData as Record<string, unknown>;
	if ("data" in obj && typeof obj.data === "object" && obj.data !== null) {
		return obj.data as Record<string, unknown>;
	}
	return obj;
}

/** field-bound blocks resolve their value from the nearest modal record, falling back to the static value. */
function resolveValue(options: DisplayValueOptions, modalData: unknown): unknown {
	if (!options.field) {
		return options.value;
	}
	const record = recordFromModalData(modalData);
	if (record && options.field in record) {
		return record[options.field];
	}
	return options.value;
}

// Synthesize the slice of TableColumn the cell helpers read. They are pure
// display components reading only name/badge/boolean/iconMap, so this is a
// cast to a real type (Option A) — no helper-signature refactor.
function toColumn(options: DisplayValueOptions): TableColumn {
	return {
		name: "value",
		badge: options.badge,
		boolean: options.boolean,
		iconMap: options.iconMap,
	};
}

function renderValue(options: DisplayValueOptions, value: unknown, col: TableColumn): ReactNode {
	if (options.kind === "badge") {
		return <BadgeCell value={value} col={col} />;
	}
	if (options.kind === "boolean") {
		return <BooleanIconCell value={value} col={col} />;
	}
	if (options.kind === "icon") {
		return <IconMapCell value={value} col={col} />;
	}
	// date / datetime / number / money are pre-formatted server-side.
	return <span>{value == null ? "" : String(value)}</span>;
}

export function DisplayValueBlock({ options }: RenderProps<DisplayValueOptions>) {
	const modalData = useModalData();
	const value = resolveValue(options, modalData);
	const content = renderValue(options, value, toColumn(options));
	if (!options.copyable) {
		return content;
	}
	return (
		<span className="inline-flex items-center gap-1">
			{content}
			<CopyButton value={value == null ? "" : String(value)} copyable={options.copyable} />
		</span>
	);
}

export const displayValueBlockDescriptor = defineBlock<"displayValue", DisplayValueOptions>(
	"displayValue",
	{ behavior: "leaf", render: DisplayValueBlock },
);
