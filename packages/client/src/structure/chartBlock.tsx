import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "../lib/useDebounce";
import type { RenderProps } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { invokeBlock } from "../render/renderDescriptor";
import { ChartCard } from "../ui/charts/ChartCard";
import { useClientActionContext } from "./actionContext";
import { ChartError, ChartSkeleton } from "./chartDefaults";
import { renderAsyncError } from "./renderAsyncError";
import type { ClientActionContext, StructureNode } from "./types";
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
	query: (ctx: ClientActionContext, params?: Record<string, string>) => Promise<TPoint[]>;
	xKey?: keyof TPoint & string;
	nameKey?: keyof TPoint & string;
	series?: ChartSeries[];
	title?: string;
	description?: string;
	height?: number;
	params?: unknown[];
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

type ChartRenderer = (data: ChartPoint[], options: ChartBlockOptions) => ReactNode;

const DEBOUNCE_KINDS = new Set(["text", "textarea", "number", "password"]);

function isParamNode(item: unknown): item is StructureNode {
	return typeof item === "object" && item !== null && "kind" in item && "options" in item;
}

function extractParamNodes(params: unknown[]): StructureNode[] {
	return params.filter(isParamNode);
}

function defaultsFromParamNodes(nodes: StructureNode[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const node of nodes) {
		if (!node.name) {
			continue;
		}
		const def = (node.options as Record<string, unknown>).default;
		if (def !== undefined && def !== null) {
			out[node.name] = String(def);
		}
	}
	return out;
}

export function createChartBlock(
	renderFn: ChartRenderer,
): ComponentType<RenderProps<ChartBlockOptions>> {
	return function ChartBlock({ options }: RenderProps<ChartBlockOptions>) {
		ensureBuiltinsRegistered();
		const ctx = useClientActionContext();
		const paramNodes = extractParamNodes(options.params ?? []);
		const hasParams = paramNodes.length > 0;

		const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
			defaultsFromParamNodes(paramNodes),
		);

		const boundQuery = useCallback(
			(actionCtx: ClientActionContext) => options.query(actionCtx, paramValues),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[options.query, paramValues],
		);

		// non-node entries in params are treated as raw deps for backward-compat
		const rawDeps = (options.params ?? []).filter((p) => !isParamNode(p));

		const { state } = useAsyncQuery<ChartPoint[]>({
			query: boundQuery,
			ctx,
			deps: rawDeps,
		});

		const onChange = useCallback((name: string, value: unknown) => {
			setParamValues((prev) => ({ ...prev, [name]: String(value ?? "") }));
		}, []);

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
				{hasParams && (
					<div className="mb-3 flex flex-wrap gap-2">
						{paramNodes.map((pNode) => (
							<ParamControl
								key={pNode.name}
								node={pNode}
								value={paramValues[pNode.name ?? ""] ?? null}
								onChange={onChange}
							/>
						))}
					</div>
				)}
				{renderFn(state.data, options)}
			</ChartCard>
		);
	};
}

interface ParamControlProps {
	node: StructureNode;
	value: string | null;
	onChange: (name: string, value: unknown) => void;
}

function ParamControl({ node, value, onChange }: ParamControlProps) {
	const name = node.name ?? "";
	const isDebounced = DEBOUNCE_KINDS.has(node.kind);

	const handleChange = useCallback(
		(next: unknown) => {
			onChange(name, next);
		},
		[name, onChange],
	);

	const debouncedChange = useDebounce(handleChange, 300);
	const onChangeForField = isDebounced ? debouncedChange : handleChange;

	const binding = useMemo(
		() => ({ name, value, onChange: onChangeForField }),
		[name, value, onChangeForField],
	);

	return (
		<>
			{invokeBlock({
				kind: node.kind,
				options: { name, ...(node.options as Record<string, unknown>) },
				meta: {},
				ctx: { surface: "form", binding },
			})}
		</>
	);
}
