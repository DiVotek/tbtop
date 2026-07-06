import type { ReactNode } from "react";
import type { AdminClient } from "../data/client";
import type { FieldConstraints } from "../inertia/constraints";
import type { ModalSize } from "../ui/modal-shell";
import type { IconDef } from "../ui/node-icon";
import type { AsyncBlock } from "./asyncBlock";
import type { CopyableConfig } from "./copyable";

// Inlined from the old auth/AuthProvider — session auth lives on the Laravel
// side now; the Inertia layout will hydrate this from shared page props.
export type AuthUser = { id: string; email: string };

export type NodeId = string;

export type ActionColor = "default" | "primary" | "danger" | "success" | "warning" | "gray";

export interface ConditionContext {
	record: Record<string, unknown> | undefined;
	data: Record<string, unknown>;
	user: unknown;
	/**
	 * Root scope for $root.-prefixed field resolution.
	 * Absent on root-level forms (treated as data). Present inside repeater
	 * rows where data = item and root = form-level data.
	 * Designed to support future $parent. multi-level nesting without wire changes.
	 */
	root?: Record<string, unknown>;
}

export type ConditionFn = (ctx: ConditionContext) => boolean;

export interface NodeMeta {
	id?: NodeId;
	hidden?: ConditionFn;
	disabled?: ConditionFn;
}

export interface StructureNode<TKind extends string = string, TOptions = unknown> {
	kind: TKind;
	name?: string;
	options: TOptions;
	meta: NodeMeta;
}

export interface TabItem {
	label: string;
	body: StructureNode;
	icon?: IconDef;
	badge?: string;
}

export interface FormController {
	initial: Record<string, unknown>;
	data: Record<string, unknown>;
	isDirty: boolean;
	isValid: boolean;
	changedFields: string[];
	set: (field: string, value: unknown) => void;
	reset: () => void;
}

export interface ListQueryParams {
	page?: number;
	perPage?: number;
	sort?: string;
	search?: string;
	filters?: Record<string, unknown>;
	/** Per-column search input values, keyed by column name. */
	colSearch?: Record<string, string>;
	/** Active predefined tab name; the first declared tab when absent. */
	tab?: string;
}

/** Predefined table tab as declared on the wire (server Tab DSL). */
export interface TableTab {
	name: string;
	label: string;
	count: boolean;
	icon?: { name: string; position: string };
	tooltip?: string;
}

export interface TableController {
	rows: unknown[];
	/** Total record count from paginated response; undefined for non-paginated. */
	total?: number;
	selectedIds: string[];
	queryParams: ListQueryParams;
	refresh: () => void;
	setQuery: (params: Partial<ListQueryParams>) => void;
	selectAll?: (ids: string[]) => void;
	clearSelection?: () => void;
}

export interface NotificationConfig {
	kind?: "info" | "success" | "error" | "warning";
	message: string;
}

export interface ModalController {
	close: () => void;
	closeAll: () => void;
	/** Surface a message in the still-open modal (e.g. a haltModal effect). */
	halt?: (message: string, level?: NotificationConfig["kind"]) => void;
}

export interface ClientActionContext {
	client: AdminClient;
	user: AuthUser | null;
	params: Record<string, string>;
	navigate: (path: string | number) => void;
	notify: (msg: NotificationConfig) => void;
	t: (key: string) => string;
	form?: FormController;
	table?: TableController;
	row?: Record<string, unknown>;
	modal?: ModalController;
}

export interface ModalConfig<TBuilder = unknown> {
	title: string;
	description?: string;
	body?: (s: TBuilder) => StructureNode;
	size?: ModalSize;
	slideOver?: boolean;
	/** Backend data query: run on open, fed to the body via ModalDataProvider. */
	query?: (ctx: ClientActionContext) => Promise<unknown>;
}

interface ActionConfigBase {
	name: string;
	label?: string;
	color?: ActionColor;
	size?: "sm" | "md" | "lg";
	outlined?: boolean;
	as?: "link" | "button";
	keybinding?: string;
	/** Compiled hidden/disabled ConditionFns; evaluated per row (or user) at render. */
	meta?: NodeMeta;
}

interface ActionConfigHandler extends ActionConfigBase {
	handler: (ctx: ClientActionContext) => void | Promise<void>;
	url?: never;
	modal?: never;
}

interface ActionConfigUrl extends ActionConfigBase {
	url: string | ((ctx: ClientActionContext) => string);
	handler?: never;
	modal?: never;
}

interface ActionConfigModal<TBuilder = unknown> extends ActionConfigBase {
	modal: ModalConfig<TBuilder>;
	handler?: never;
	url?: never;
}

export type ActionConfig<TBuilder = unknown> =
	| ActionConfigHandler
	| ActionConfigUrl
	| ActionConfigModal<TBuilder>;

export interface FormOptions extends Partial<AsyncBlock> {
	query?: (ctx: ClientActionContext) => Promise<unknown>;
	schema?: { parse: (input: unknown) => unknown };
	/** Show a confirm dialog when navigating away with unsaved changes. Defaults to true. */
	guardUnsaved?: boolean;
}

export interface PaginatedResponse<TRow = unknown> {
	data: TRow[];
	total: number;
	page?: number;
	perPage?: number;
}

export interface TableOptions<TRow = unknown, TBuilder = unknown> extends AsyncBlock {
	query: (ctx: ClientActionContext) => Promise<TRow[] | PaginatedResponse<TRow>>;
	columns: TableColumn<TRow>[];
	rowActions?: (ActionConfig<TBuilder> | StructureNode)[];
	bulkActions?: ActionConfig<TBuilder>[];
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn?: "modal" | "inline";
	/** Predefined filter tabs rendered above the toolbar. */
	tabs?: TableTab[];
	/** Server-provided pagination config. */
	pagination?: TablePaginationOptions;
	/** Server-assigned table name — used to namespace URL query state. */
	name?: string;
	/**
	 * Name of a row action to trigger when the user clicks a row.
	 * Clicks on interactive elements (a, button, input, etc.) are ignored.
	 */
	rowClick?: string;
}

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
	copyable?: CopyableConfig;
	translatable?: boolean;
	badge?: TableColumnBadgeOptions;
	boolean?: TableColumnBooleanOptions;
	iconMap?: Record<string, TableColumnIconMapEntry>;
	shape?: "square" | "circular" | "rounded";
	alt?: string;
	editable?: {
		as: "boolean" | "text" | "select";
		constraints?: FieldConstraints;
		/** Static options for an inline select column ({value, label}). */
		options?: Array<{ value: string; label: string }>;
	};
}

export interface TablePaginationOptions {
	perPage?: number;
	options?: number[];
}
