import type { ReactNode } from "react";
import type { ClientActionContext } from "./types";

export interface AsyncBlock {
	query: (ctx: ClientActionContext, ...args: never[]) => Promise<unknown>;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

interface AsyncSingleOptionsBlock<TRow, TValue = unknown> extends AsyncBlock {
	query: (ctx: ClientActionContext, search: string) => Promise<TRow[]>;
	optionLabel: (row: TRow) => string;
	optionValue: (row: TRow) => TValue;
	onLoad?: (ctx: ClientActionContext, value: TValue) => Promise<TRow>;
}

interface AsyncMultiOptionsBlock<TRow, TValue = unknown> extends AsyncBlock {
	query: (ctx: ClientActionContext, search: string) => Promise<TRow[]>;
	optionLabel: (row: TRow) => string;
	optionValue: (row: TRow) => TValue;
	onLoad?: (ctx: ClientActionContext, values: TValue[]) => Promise<TRow[]>;
}
