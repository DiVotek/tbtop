import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: visuals come from `cn-switch` / `cn-switch-thumb` in
// `ui/presets/style-preset-*.css`, including the checked colors and thumb
// travel (each style sizes them differently). Our delta: the `size` prop
// (upstream has a single size) plus `data-size` for density overrides.
function Switch({
	className,
	size = "default",
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: "sm" | "default";
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				"cn-switch peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="cn-switch-thumb pointer-events-none block ring-0 transition-transform"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
