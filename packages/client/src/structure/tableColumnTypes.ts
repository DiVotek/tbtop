/**
 * TableColumn and its per-kind option shapes — split out of types.ts to keep
 * that file under the line-count cap. Re-exported from types.ts so existing
 * `import type { TableColumn } from "../types"` call sites are unaffected.
 */
import type { ReactNode } from "react";
import type { FieldConstraints } from "../inertia/constraints";
import type { CopyableConfig } from "./copyable";

export interface TableColumnIcon {
	name: string;
	position?: "left" | "right";
}

export interface TableColumnBadgeOptions {
	colors?: Record<string, string>;
}

export interface TableColumnBooleanOptions {
	trueIcon?: string;
	falseIcon?: string;
	trueColor?: string;
	falseColor?: string;
}

export interface TableColumnIconMapEntry {
	icon: string;
	color?: string;
}

export interface TableColumnLinkOptions {
	external?: boolean;
	icon?: string;
}

export interface TableColumn<TRow = unknown> {
	name: string;
	label?: string;
	/** Field kind whose cell component renders the value (server-authored tables). */
	kind?: string;
	render?: (row: TRow) => ReactNode;

	// --- wire-contract additions ---
	sortable?: boolean;
	searchable?: boolean;
	/** Renders a per-column search input in the table header. */
	columnSearchable?: boolean;
	toggleable?: boolean;
	hiddenByDefault?: boolean;
	align?: "left" | "center" | "right";
	icon?: TableColumnIcon;
	width?: string;
	wrap?: boolean;
	tooltip?: string;
	/** Emphasized primary link-style cell text (e.g. a title column driving rowClick). */
	emphasized?: boolean;
	/** Small muted cell text — secondary metadata columns (dates, parents, counts). */
	muted?: boolean;
	/** Uppercase wide-tracked cell text — short code-like values (types, statuses). */
	uppercase?: boolean;
	copyable?: CopyableConfig;
	translatable?: boolean;
	badge?: TableColumnBadgeOptions;
	boolean?: TableColumnBooleanOptions;
	iconMap?: Record<string, TableColumnIconMapEntry>;
	shape?: "square" | "circular" | "rounded";
	alt?: string;
	link?: TableColumnLinkOptions;
	editable?: {
		as: "boolean" | "text" | "select";
		constraints?: FieldConstraints;
		/** Static options for an inline select column ({value, label}). */
		options?: Array<{ value: string; label: string }>;
	};
}
