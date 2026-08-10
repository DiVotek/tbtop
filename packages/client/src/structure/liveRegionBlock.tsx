import { useEffect, useRef, useState } from "react";
import { readDeps } from "../fields/fieldDependencies";
import type { RenderProps } from "../render/blockRegistry";
import { useClientActionContext } from "./actionContext";
import { AsyncErrorBox } from "./asyncErrorBox";
import { useNearestFormController } from "./formContext";
import type { ClientActionContext, StructureNode } from "./types";

export interface LiveRegionOptions {
	dependsOn?: string[];
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
	const ctrl = useNearestFormController();
	const { deps } = readDeps(options.dependsOn ?? [], ctrl?.data ?? {});
	const depsKey = JSON.stringify(deps);

	const [nodes, setNodes] = useState<StructureNode[]>(options.initial ?? []);
	const [reloading, setReloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const query = options.query;
	// The initial content is server-rendered from the same deps, so the
	// mount-time key must not trigger a fetch — only subsequent changes do.
	const prevKeyRef = useRef(depsKey);
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
