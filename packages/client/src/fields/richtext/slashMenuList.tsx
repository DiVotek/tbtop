import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import type { SlashCommand } from "./slashMenuCommands";
import type { SlashMenuPosition } from "./slashMenuPosition";

export interface SlashMenuListProps {
	commands: SlashCommand[];
	selectedIndex: number;
	position: SlashMenuPosition;
	portalTarget: Element;
	onHover: (index: number) => void;
	onSelect: (index: number) => void;
}

export function SlashMenuList({
	commands,
	selectedIndex,
	position,
	portalTarget,
	onHover,
	onSelect,
}: SlashMenuListProps) {
	return createPortal(
		<div
			className="absolute z-50 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
			style={{ top: position.top, left: position.left }}
		>
			{commands.map((cmd, index) => (
				<button
					key={cmd.label}
					type="button"
					className={cn(
						"relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors",
						index === selectedIndex
							? "bg-accent text-accent-foreground"
							: "text-foreground hover:bg-accent hover:text-accent-foreground",
					)}
					onMouseEnter={() => onHover(index)}
					onMouseDown={(e) => {
						e.preventDefault();
						onSelect(index);
					}}
				>
					<span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
						{cmd.icon}
					</span>
					{cmd.label}
				</button>
			))}
		</div>,
		portalTarget,
	);
}
