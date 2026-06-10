import { ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { RenderProps } from "../render/blockRegistry";
import { Button } from "../ui/button";
import type { StructureNode } from "./structure";

interface ActionGroupOptions {
	label: string;
}

export function ActionGroupBlock({
	options,
	children,
	renderChild,
}: RenderProps<ActionGroupOptions>) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	return (
		<div className="relative inline-block" ref={containerRef}>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen((prev) => !prev)}
				data-testid="action-group-trigger"
			>
				{options.label}
				<ChevronDownIcon className="ml-1 size-4" />
			</Button>
			{open && (
				<div
					className="absolute left-0 top-full z-50 mt-1 min-w-40 rounded-md border bg-popover p-1 shadow-md"
					data-testid="action-group-menu"
					onPointerDown={(e) => e.stopPropagation()}
				>
					{renderMenuItems(children, renderChild, () => setOpen(false))}
				</div>
			)}
		</div>
	);
}

function renderMenuItems(
	children: StructureNode[] | undefined,
	renderChild: (node: StructureNode) => React.ReactNode,
	_close: () => void,
): React.ReactNode {
	if (!children) {
		return null;
	}
	return children.map((child, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
		<div key={i} className="px-1 py-0.5">
			{renderChild(child)}
		</div>
	));
}
