import type { ComponentType, ReactNode } from "react";
import type { RenderProps } from "../render/blockRegistry";
import { ChartCard } from "../ui/charts/ChartCard";
import { useClientActionContext } from "./actionContext";
import type { AsyncBlock } from "./asyncBlock";
import { ChartError, ChartSkeleton } from "./chartDefaults";
import { renderAsyncError } from "./renderAsyncError";
import type { ClientActionContext } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

export type ChartType = "line" | "bar" | "area" | "pie" | "donut";

export interface ChartPoint {
	[key: string]: string | number | null | undefined;
}

export interface ChartSeries {
	dataKey: string;
	label?: string;
	color?: string;
}

export interface ChartBlockOptions<TPoint extends ChartPoint = ChartPoint> extends AsyncBlock {
	type: ChartType;
	query: (ctx: ClientActionContext) => Promise<TPoint[]>;
	xKey?: keyof TPoint & string;
	nameKey?: keyof TPoint & string;
	series?: ChartSeries[];
	title?: string;
	description?: string;
	height?: number;
	params?: unknown[];
}

export type ChartRenderer = (data: ChartPoint[], options: ChartBlockOptions) => ReactNode;

export function createChartBlock(
	renderFn: ChartRenderer,
): ComponentType<RenderProps<ChartBlockOptions>> {
	return function ChartBlock({ options }: RenderProps<ChartBlockOptions>) {
		const ctx = useClientActionContext();
		const { state } = useAsyncQuery<ChartPoint[]>({
			query: options.query,
			ctx,
			deps: options.params ?? [],
		});

		if (state.kind === "loading") {
			return <>{options.loading ?? <ChartSkeleton />}</>;
		}
		if (state.kind === "error") {
			const fallback = <ChartError message={state.message} />;
			return <>{renderAsyncError(options.error, state.message, fallback)}</>;
		}
		return (
			<ChartCard
				title={options.title}
				description={options.description}
				height={options.height}
			>
				{renderFn(state.data, options)}
			</ChartCard>
		);
	};
}
