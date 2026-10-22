import * as PopoverPrimitive from "@radix-ui/react-popover";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: structural classes live here as `cn-*` names, the visual
// definitions live in `ui/presets/style-preset-*.css`.
//
// `data-[state=*]` animation classes duplicate the preset's open/close
// rules for Radix, which emits `data-state` (see the `data-open` /
// `data-closed` variants in core.css).
const radixStateAnimation =
	"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot="popover-content"
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"cn-popover-content z-50 w-72 origin-(--radix-popover-content-transform-origin) outline-hidden",
					radixStateAnimation,
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
	return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="popover-header" className={cn("cn-popover-header", className)} {...props} />
	);
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<div data-slot="popover-title" className={cn("cn-popover-title", className)} {...props} />
	);
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="popover-description"
			className={cn("cn-popover-description", className)}
			{...props}
		/>
	);
}

export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
};
