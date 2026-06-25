import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";
import { CopyButton } from "../ui/copyButton";
import type { CopyableConfig } from "./copyable";
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

export function DisplayValueBlock({ options }: RenderProps<DisplayValueOptions>) {
	const col = toColumn(options);
	if (options.kind === "badge") {
		return <BadgeCell value={options.value} col={col} />;
	}
	if (options.kind === "boolean") {
		return <BooleanIconCell value={options.value} col={col} />;
	}
	if (options.kind === "icon") {
		return <IconMapCell value={options.value} col={col} />;
	}
	// date / datetime / number / money are pre-formatted server-side.
	const text = options.value == null ? "" : String(options.value);
	if (options.copyable) {
		return (
			<span className="inline-flex items-center gap-1">
				{text}
				<CopyButton value={text} copyable={options.copyable} />
			</span>
		);
	}
	return <span>{text}</span>;
}

export const displayValueBlockDescriptor = defineBlock<"displayValue", DisplayValueOptions>(
	"displayValue",
	{ behavior: "leaf", render: DisplayValueBlock },
);
