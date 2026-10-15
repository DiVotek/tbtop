import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: layout and enter/exit motion come from `cn-tooltip-content`
// in `ui/presets/style-preset-*.css`. Deltas on top of upstream: a 300ms
// default delay, a self-contained provider per Tooltip, a 4px side offset,
// primary colors (upstream: foreground/background), and no arrow. The portal
// target is <body>, inside the `.style-preset-*` scope set on <html>.

function TooltipProvider({
	delayDuration = 300,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	);
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	);
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					"cn-tooltip-content z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) bg-primary text-primary-foreground",
					className,
				)}
				{...props}
			/>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
