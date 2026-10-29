import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "../lib/useDebounce";
import { invokeBlock } from "../render/renderDescriptor";
import type { StructureNode } from "./types";

/**
 * Filter-field controls shared by blocks that refetch their own data on a
 * param change (charts, stats). The values are plain strings: they travel as
 * the data endpoint's query string.
 */

const DEBOUNCE_KINDS = new Set(["text", "textarea", "number", "password"]);

export function isParamNode(item: unknown): item is StructureNode {
	return typeof item === "object" && item !== null && "kind" in item && "options" in item;
}

export function extractParamNodes(params: unknown[]): StructureNode[] {
	return params.filter(isParamNode);
}

export function defaultsFromParamNodes(nodes: StructureNode[]): Record<string, string> {
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

interface ParamControlsProps {
	nodes: StructureNode[];
	values: Record<string, string>;
	onChange: (name: string, value: unknown) => void;
	className: string;
	testId: string;
}

export function ParamControls({ nodes, values, onChange, className, testId }: ParamControlsProps) {
	return (
		<div className={className} data-testid={testId}>
			{nodes.map((node) => (
				<ParamControl
					key={node.name}
					node={node}
					value={values[node.name ?? ""] ?? null}
					onChange={onChange}
				/>
			))}
		</div>
	);
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
	// The control shows its own draft: the owner's value only moves once the
	// debounce settles, and binding that would snap every keystroke back.
	const [draft, setDraft] = useState<unknown>(value);
	const onChangeForField = useCallback(
		(next: unknown) => {
			setDraft(next);
			(isDebounced ? debouncedChange : handleChange)(next);
		},
		[isDebounced, debouncedChange, handleChange],
	);

	const binding = useMemo(
		() => ({ name, value: draft, onChange: onChangeForField }),
		[name, draft, onChangeForField],
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
