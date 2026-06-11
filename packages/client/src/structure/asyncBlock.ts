import type { ReactNode } from "react";
import type { ClientActionContext } from "./types";

export interface AsyncBlock {
	query: (ctx: ClientActionContext, ...args: never[]) => Promise<unknown>;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}
