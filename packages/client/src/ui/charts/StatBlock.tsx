import { useCallback, useState } from "react";
import { pollIntervalMs } from "../../lib/pollInterval";
import { usePolling } from "../../lib/usePolling";
import type { RenderProps } from "../../render/blockRegistry";
import { useClientActionContext } from "../../structure/actionContext";
import type { ClientActionContext } from "../../structure/types";
import type { StatDescriptor } from "./StatCard";
import { StatCard } from "./StatCard";

export interface StatBlockOptions extends StatDescriptor {
	/** Server-declared refresh interval in seconds; clamped to a 5s minimum. */
	poll?: number;
	/** Page data-endpoint key (the stat's label); set only when poll() was used. */
	source?: string;
	/** Injected by materializeStat when `source` is present. */
	query?: (ctx: ClientActionContext) => Promise<unknown>;
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
	if (intervalMs === null || query === undefined) {
		return <StatCard options={options} />;
	}
	return <PollingStatCard options={options} query={query} intervalMs={intervalMs} />;
}

interface PollingStatCardProps {
	options: StatBlockOptions;
	query: (ctx: ClientActionContext) => Promise<unknown>;
	intervalMs: number;
}

function PollingStatCard({ options, query, intervalMs }: PollingStatCardProps) {
	const ctx = useClientActionContext();
	const [fresh, setFresh] = useState<StatPollPayload | null>(null);

	// Failed polls keep the last shown value — a KPI tile has no error surface.
	const tick = useCallback(() => {
		query(ctx)
			.then((data) => setFresh(data as StatPollPayload))
			.catch(() => {});
	}, [query, ctx]);

	usePolling(tick, intervalMs);

	return <StatCard options={{ ...options, ...fresh }} />;
}
