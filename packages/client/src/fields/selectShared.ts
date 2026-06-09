import type { ReactNode } from "react";
import type { AsyncMultiOptionsBag, AsyncSingleOptionsBag } from "./asyncOptions";

export interface StaticOption {
	value: string;
	label: string;
}

interface CommonSelectBag {
	options?: StaticOption[];
	multiple?: boolean;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

export interface SelectSingleOptionsBag extends CommonSelectBag, AsyncSingleOptionsBag {}

export interface SelectMultiOptionsBag extends CommonSelectBag, AsyncMultiOptionsBag {}

export type SelectOptionsBag = SelectSingleOptionsBag | SelectMultiOptionsBag;

export type SelectValueType = string | string[];
