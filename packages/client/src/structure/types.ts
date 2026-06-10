import type { ReactNode } from "react";
import type { AdminClient } from "../data/client";
import type { AsyncBlock } from "./asyncBlock";

// Inlined from the old auth/AuthProvider — session auth lives on the Laravel
// side now; the Inertia layout will hydrate this from shared page props.
export type AuthUser = {
	id: string;
	email: string;
};

export type NodeId = string;

export type ActionColor = "default" | "primary" | "danger" | "success" | "warning";

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
}

export interface TableController {
	rows: unknown[];
	selectedIds: string[];
	queryParams: ListQueryParams;
	refresh: () => void;
	setQuery: (params: Partial<ListQueryParams>) => void;
}

export interface NotificationConfig {
	kind?: "info" | "success" | "error" | "warning";
	message: string;
}

export interface ModalController {
	close: () => void;
	closeAll: () => void;
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
}

interface ActionConfigBase {
	name: string;
	label?: string;
	color?: ActionColor;
	keybinding?: string;
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
}

export interface TableOptions<TRow = unknown, TBuilder = unknown> extends AsyncBlock {
	query: (ctx: ClientActionContext) => Promise<TRow[]>;
	columns: TableColumn<TRow>[];
	rowActions?: ActionConfig<TBuilder>[];
	bulkActions?: ActionConfig<TBuilder>[];
	searchable?: string[];
	filters?: StructureNode[];
	filtersIn?: "modal" | "inline";
}

export interface TableColumn<TRow = unknown> {
	name: string;
	label?: string;
	/** Field kind whose cell component renders the value (server-authored tables). */
	kind?: string;
	render?: (row: TRow) => ReactNode;
}
