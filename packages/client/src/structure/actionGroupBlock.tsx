import { ChevronDownIcon, MoreHorizontalIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { RenderProps } from "../render/blockRegistry";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useNearestRow } from "./rowContext";
import type { StructureNode } from "./structure";

interface ActionGroupOptions {
	label: string;
	/** Render mode: 'dropdown' → Radix DropdownMenu; 'buttons' or absent → flat button list. */
	as?: "buttons" | "dropdown";
}

export function ActionGroupBlock({
	options,
	children,
	renderChild,
}: RenderProps<ActionGroupOptions>) {
	const asMode = options.as ?? "buttons";

	if (asMode === "dropdown") {
		return (
			<ActionGroupDropdown
				label={options.label}
				children={children}
				renderChild={renderChild}
			/>
		);
	}

	return (
		<ActionGroupButtons label={options.label} children={children} renderChild={renderChild} />
	);
}

// ─── Dropdown mode (Radix) ────────────────────────────────────────────────────

interface GroupProps {
	label: string;
	children: StructureNode[] | undefined;
	renderChild: (node: StructureNode) => React.ReactNode;
}

function ActionGroupDropdown({ label, children, renderChild }: GroupProps) {
	const row = useNearestRow();

	// Inside a table row: icon-only trigger (MoreHorizontal); outside: label + chevron.
	const trigger = row ? (
		<Button
			variant="ghost"
			size="sm"
			className="h-8 w-8 p-0"
			data-testid="action-group-trigger"
			aria-label={label}
		>
			<MoreHorizontalIcon className="size-4" aria-hidden />
		</Button>
	) : (
		<Button variant="outline" size="sm" data-testid="action-group-trigger">
			{label}
			<ChevronDownIcon className="ml-1 size-4" />
		</Button>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent align="end" data-testid="action-group-menu">
				{children?.map((child, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
					<DropdownMenuItem key={i} asChild>
						<div className="w-full">{renderChild(child)}</div>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// ─── Buttons mode (default, backward-compat) ─────────────────────────────────

function ActionGroupButtons({ label, children, renderChild }: GroupProps) {
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
				{label}
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
