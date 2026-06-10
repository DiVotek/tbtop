import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import type { RenderProps } from "../render/blockRegistry";
import type { StructureNode } from "./structure";

interface CollapsibleOptions {
	label: string;
	collapsed?: boolean;
}

export function CollapsibleBlock({
	options,
	children,
	renderChild,
}: RenderProps<CollapsibleOptions>) {
	const [open, setOpen] = useState(!options.collapsed);

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				className="flex items-center gap-2 text-sm font-medium"
				onClick={() => setOpen((prev) => !prev)}
				data-testid="collapsible-toggle"
			>
				{open ? (
					<ChevronDownIcon className="size-4" />
				) : (
					<ChevronRightIcon className="size-4" />
				)}
				{options.label}
			</button>
			{open && (
				<div className="flex flex-col gap-3 pl-6">{mapChildren(children, renderChild)}</div>
			)}
		</div>
	);
}

function mapChildren(
	children: StructureNode[] | undefined,
	renderChild: (node: StructureNode) => React.ReactNode,
): React.ReactNode {
	if (!children) {
		return null;
	}
	return children.map((child, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
		<div key={i}>{renderChild(child)}</div>
	));
}
