import type * as React from "react";

import { useDensity } from "../app/densityContext";
import { cn } from "../lib/cn";

// New-gen shape: visuals come from `cn-textarea` in
// `ui/presets/style-preset-*.css`. Our delta: compact density shrinks the
// desktop font to match a compact Input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	const density = useDensity();
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
				density === "compact" && "md:text-xs",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
