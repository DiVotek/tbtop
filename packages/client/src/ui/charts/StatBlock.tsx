import { useCallback, useRef, useState } from "react";
import { pollIntervalMs } from "../../lib/pollInterval";
import { usePolling } from "../../lib/usePolling";
import type { RenderProps } from "../../render/blockRegistry";
import { useClientActionContext } from "../../structure/actionContext";
import {
	defaultsFromParamNodes,
	extractParamNodes,
	ParamControls,
} from "../../structure/blockParams";
import type { ClientActionContext, StructureNode } from "../../structure/types";
import type { StatDescriptor } from "./StatCard";
import { StatCard } from "./StatCard";

type StatParams = Record<string, string>;
type StatQuery = (ctx: ClientActionContext, params?: StatParams) => Promise<unknown>;

export interface StatBlockOptions extends StatDescriptor {
	/** Server-declared refresh interval in seconds; clamped to a 5s minimum. */
	poll?: number;
	/** Param field nodes rendered in the card; each change refetches the stat. */
	params?: unknown[];
	/** Page data-endpoint key (the stat's label); set when poll() or params() was used. */
	source?: string;
	/** Injected by materializeStat when `source` is present. */
	query?: StatQuery;
}

/** Refreshed descriptor slice returned by the stat data endpoint. */
interface StatPollPayload {
	value?: unknown;
	description?: string;
	sparkline?: number[];
}

export function StatBlock({ options }: RenderProps<StatBlockOptions>) {
	const { query } = options;
	const intervalMs = query ? pollIntervalMs(options.poll) : null;
	const paramNodes = extractParamNodes(options.params ?? []);
	if (query === undefined || (intervalMs === null && paramNodes.length === 0)) {
		return <StatCard options={options} />;
	}
	return (
		<LiveStatCard
			options={options}
			query={query}
			intervalMs={intervalMs}
			paramNodes={paramNodes}
		/>
	);
}

interface LiveStatCardProps {
	options: StatBlockOptions;
	query: StatQuery;
	intervalMs: number | null;
	paramNodes: StructureNode[];
}

/**
 * The server renders the value for the params' defaults, so the first fetch
 * waits for a param change or a poll tick. Failed fetches keep the last shown
 * value — a KPI tile has no error surface.
 */
function LiveStatCard({ options, query, intervalMs, paramNodes }: LiveStatCardProps) {
	const ctx = useClientActionContext();
	const [fresh, setFresh] = useState<StatPollPayload | null>(null);
	const [paramValues, setParamValues] = useState<StatParams>(() =>
		defaultsFromParamNodes(paramNodes),
	);
	const latest = useRef(0);
	// Read through a ref: a debounced control may call a stale onChange.
	const paramsRef = useRef(paramValues);

	const load = useCallback(
		(params: StatParams) => {
			const ticket = ++latest.current;
			query(ctx, params)
				.then((data) => {
					// A slower earlier response must not overwrite a newer param choice.
					if (ticket === latest.current) {
						setFresh(data as StatPollPayload);
					}
				})
				.catch(() => {});
		},
		[query, ctx],
	);

	usePolling(() => load(paramsRef.current), intervalMs);

	const onChange = useCallback(
		(name: string, value: unknown) => {
			const next = { ...paramsRef.current, [name]: String(value ?? "") };
			paramsRef.current = next;
			setParamValues(next);
			load(next);
		},
		[load],
	);

	const toolbar =
		paramNodes.length > 0 ? (
			<ParamControls
				nodes={paramNodes}
				values={paramValues}
				onChange={onChange}
				className="mt-1 flex w-full flex-wrap gap-2"
				testId="stat-params"
			/>
		) : undefined;

	return <StatCard options={{ ...options, ...fresh }} toolbar={toolbar} />;
}
