import { useEffect, useRef, useState } from "react";
import { readDeps, useFieldDependencies } from "../fields/fieldDependencies";
import type { RenderProps } from "../render/blockRegistry";
import { useClientActionContext } from "./actionContext";
import { AsyncErrorBox } from "./asyncErrorBox";
import type { ClientActionContext, StructureNode } from "./types";

export interface LiveRegionOptions {
	dependsOn?: string[];
	/** Deps the server rendered `initial` with — see the mount check below. */
	initialDeps?: Record<string, string>;
	initial?: StructureNode[];
	/** Injected at materialize time — never on the wire. */
	query?: (ctx: ClientActionContext, deps: Record<string, string>) => Promise<StructureNode[]>;
}

/**
 * Server-rendered region that reloads when a watched form field changes.
 * The first render ships as options.initial; every deps change re-fetches
 * and swaps the content. While reloading, the previous content stays
 * visible but dimmed — a skeleton here would shift layout on every change.
 */
export function LiveRegionBlock({ options, renderChild }: RenderProps<LiveRegionOptions>) {
	const ctx = useClientActionContext();
	const dependsOn = options.dependsOn ?? [];
	// Provider-aware: inside a repeater row the deps resolve against the row bag.
	const { deps } = useFieldDependencies({ config: { dependsOn } });
	const depsKey = JSON.stringify(deps);

	const [nodes, setNodes] = useState<StructureNode[]>(options.initial ?? []);
	const [reloading, setReloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const query = options.query;
	// The initial content was server-rendered with initialDeps. A region that
	// mounts late (tab, collapsible) may see the form already ahead of them —
	// seeding the ref with the *initial* key makes such a mount fetch at once.
	// readDeps canonicalizes both sides (declared keys, empties dropped).
	const initialKey = options.initialDeps
		? JSON.stringify(readDeps(dependsOn, options.initialDeps).deps)
		: depsKey;
	const prevKeyRef = useRef(initialKey);
	const latestKeyRef = useRef(depsKey);
	const depsRef = useRef(deps);
	depsRef.current = deps;
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;

	useEffect(() => {
		if (!query || prevKeyRef.current === depsKey) {
			return;
		}
		prevKeyRef.current = depsKey;
		latestKeyRef.current = depsKey;
		setReloading(true);
		query(ctxRef.current, depsRef.current).then(
			(fresh) => {
				// Latest deps win: an answer for a superseded key is dropped.
				if (latestKeyRef.current !== depsKey) {
					return;
				}
				setNodes(fresh);
				setReloading(false);
				setError(null);
			},
			(err: unknown) => {
				if (latestKeyRef.current !== depsKey) {
					return;
				}
				setReloading(false);
				setError(extractMessage(err));
			},
		);
	}, [depsKey, query]);

	return (
		<div
			data-testid="live-region"
			aria-busy={reloading || undefined}
			className={`transition-opacity ${reloading ? "opacity-60" : ""}`}
		>
			{nodes.map((child, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: structure children are positional
				<div key={i}>{renderChild(child)}</div>
			))}
			{error !== null && <AsyncErrorBox testId="live-region-error" message={error} />}
		</div>
	);
}

function extractMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "string") {
		return err;
	}
	return "Query failed";
}
