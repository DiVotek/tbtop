import type { ReactNode } from "react";
import type { StructureNode } from "../structure/types";
import type { AsyncMultiOptionsBag, AsyncSingleOptionsBag } from "./asyncOptions";

export interface StaticOption {
	value: string;
	label: string;
}

export interface SelectCreateConfig {
	fields: StructureNode[];
	/** Injected by materialize — POSTs to the select-create endpoint and returns {value, label}. */
	post: (
		ctx: unknown,
		data: Record<string, unknown>,
	) => Promise<{ value: string; label: string }>;
}

interface CommonSelectBag {
	options?: StaticOption[];
	multiple?: boolean;
	searchable?: boolean;
	create?: SelectCreateConfig;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

export interface SelectSingleOptionsBag extends CommonSelectBag, AsyncSingleOptionsBag {}

export interface SelectMultiOptionsBag extends CommonSelectBag, AsyncMultiOptionsBag {}

export type SelectOptionsBag = SelectSingleOptionsBag | SelectMultiOptionsBag;

export type SelectValueType = string | string[];
