import type { ReactNode } from "react";
import { Button } from "../../../ui/button";

interface ToolbarButtonProps {
	onClick: () => void;
	active?: boolean;
	label: string;
	disabled?: boolean;
	children: ReactNode;
}

// Shared icon-button recipe for every toolbar control, built on the shared
// Button. aria-pressed mirrors the active/formatting state for assistive tech.
export function ToolbarButton({ onClick, active, label, disabled, children }: ToolbarButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onClick}
			disabled={disabled}
			title={label}
			aria-label={label}
			aria-pressed={active ?? false}
			data-active={active ? "" : undefined}
			className="text-muted-foreground [&_svg]:size-[18px] data-[active]:bg-muted data-[active]:text-foreground"
		>
			{children}
		</Button>
	);
}
