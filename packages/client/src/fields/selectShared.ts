import type { ReactNode } from "react";
import type { StructureNode } from "../structure/types";
import type { AsyncMultiOptionsBag, AsyncSingleOptionsBag } from "./asyncOptions";
import type { DependencyConfig } from "./fieldDependencies";
import type { AffixOptions } from "./inputGroup";

/**
 * `html` wins: when present it renders alone and image/subtitle are ignored.
 * It is injected verbatim and never sanitized — compose it from trusted data.
 */
export interface OptionDisplay {
	image?: string;
	subtitle?: string;
	html?: string;
}

/**
 * `label` is the option's text identity, not its looks: it feeds the chip's
 * aria-label, Radix typeahead, and searchable() filtering. `html` reaches none.
 */
export interface StaticOption {
	value: string;
	label: string;
	display?: OptionDisplay;
}

export interface SelectCreateConfig {
	fields: StructureNode[];
	/** Injected by materialize — POSTs to the select-create endpoint and returns {value, label}. */
	post: (
		ctx: unknown,
		data: Record<string, unknown>,
	) => Promise<{ value: string; label: string }>;
}

interface CommonSelectBag extends AffixOptions {
	options?: StaticOption[];
	multiple?: boolean;
	searchable?: boolean;
	create?: SelectCreateConfig;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

export interface SelectSingleOptionsBag
	extends CommonSelectBag,
		AsyncSingleOptionsBag,
		DependencyConfig {}

export interface SelectMultiOptionsBag extends CommonSelectBag, AsyncMultiOptionsBag {}

export type SelectOptionsBag = SelectSingleOptionsBag | SelectMultiOptionsBag;

export type SelectValueType = string | string[];

/**
 * Records carry int FKs (author_id: 1) while wire options are
 * string-cast ("1"); coerce before any option matching.
 */
export function coerceSelectValue(value: unknown): SelectValueType | null {
	if (Array.isArray(value)) {
		return value.map(String);
	}
	if (typeof value === "number") {
		return String(value);
	}
	return typeof value === "string" ? value : null;
}
