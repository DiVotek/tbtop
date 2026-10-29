import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { pollIntervalMs } from "../lib/pollInterval";
import { useChartColors } from "../lib/useChartColors";
import { usePolling } from "../lib/usePolling";
import type { RenderProps } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { ChartCard } from "../ui/charts/ChartCard";
import { useClientActionContext } from "./actionContext";
import {
	defaultsFromParamNodes,
	extractParamNodes,
	isParamNode,
	ParamControls,
} from "./blockParams";
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

export interface ChartBlockOptions<TPoint extends ChartPoint = ChartPoint> {
	type: ChartType;
	data?: TPoint[];
	query?: (ctx: ClientActionContext, params?: Record<string, string>) => Promise<TPoint[]>;
	xKey?: keyof TPoint & string;
	nameKey?: keyof TPoint & string;
	series?: ChartSeries[];
	title?: string;
	description?: string;
	height?: number;
	params?: unknown[];
	/** Server-declared refresh interval in seconds; clamped to a 5s minimum. */
	poll?: number;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

export type ChartBlockInput<TPoint extends ChartPoint = ChartPoint> =
	| (ChartBlockOptions<TPoint> & { data: TPoint[] })
	| (ChartBlockOptions<TPoint> & { query: NonNullable<ChartBlockOptions<TPoint>["query"]> });

type ChartRenderer = (
	data: ChartPoint[],
	options: ChartBlockOptions,
	colors: string[],
) => ReactNode;

export function createChartBlock(
	renderFn: ChartRenderer,
): ComponentType<RenderProps<ChartBlockOptions>> {
	return function ChartBlock({ options }: RenderProps<ChartBlockOptions>) {
		ensureBuiltinsRegistered();
		const ctx = useClientActionContext();
		const colors = useChartColors();
		const paramNodes = extractParamNodes(options.params ?? []);
		const hasParams = paramNodes.length > 0;

		const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
			defaultsFromParamNodes(paramNodes),
		);

		const query = options.query;
		const boundQuery = useMemo(
			() =>
				query
					? (actionCtx: ClientActionContext) => query(actionCtx, paramValues)
					: undefined,
			[query, paramValues],
		);

		// non-node entries in params are treated as raw deps for backward-compat
		const rawDeps = (options.params ?? []).filter((p) => !isParamNode(p));

		const { state, refetch } = useAsyncQuery<ChartPoint[]>({
			query: boundQuery,
			ctx,
			deps: rawDeps,
		});

		// Server-declared poll: refetch on an interval (cleanup handled by the hook).
		usePolling(refetch, pollIntervalMs(query ? options.poll : undefined));

		const onChange = useCallback((name: string, value: unknown) => {
			setParamValues((prev) => ({ ...prev, [name]: String(value ?? "") }));
		}, []);

		if (query && state.kind === "loading" && options.data === undefined) {
			return <>{options.loading ?? <ChartSkeleton />}</>;
		}
		// Unlike the loading branch above, a failed query does NOT fall back to
		// options.data: stale numbers with no failure signal read as current.
		if (query && state.kind === "error") {
			const fallback = <ChartError message={state.message} />;
			return <>{renderAsyncError(options.error, state.message, fallback)}</>;
		}
		const queryData =
			state.kind === "loaded" || state.kind === "reloading" ? state.data : undefined;
		const data = query ? (queryData ?? options.data ?? []) : (options.data ?? []);
		// Params render via ChartCard's toolbar slot, ABOVE the fixed-height
		// canvas — inside it they steal height and push the legend out of the card.
		const toolbar = hasParams ? (
			<ParamControls
				nodes={paramNodes}
				values={paramValues}
				onChange={onChange}
				className="mb-3 flex flex-wrap gap-2"
				testId="chart-params"
			/>
		) : undefined;

		return (
			<ChartCard
				title={options.title}
				description={options.description}
				height={options.height}
				toolbar={toolbar}
			>
				{renderFn(data, options, colors)}
			</ChartCard>
		);
	};
}
