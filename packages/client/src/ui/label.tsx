import * as LabelPrimitive from "@radix-ui/react-label";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: typography and disabled dimming come from `cn-label` in
// `ui/presets/style-preset-*.css`.
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"cn-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
