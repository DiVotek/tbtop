import type * as React from "react";

import { useDensity } from "../app/densityContext";
import { cn } from "../lib/cn";

// New-gen shape: structural classes live here, the visual definition is the
// `cn-input` rule in `ui/presets/style-preset-*.css`. Our deltas on top of
// upstream: the exported font/padding helpers (overlays sit flush on an Input
// through `inputTextClass`), selection colors, and density-aware compact sizing.

// text-base below md keeps iOS Safari from zooming the viewport on focus, so
// any control holding a text cursor must carry these instead of a bare text-sm.
const inputFontClass = "text-base md:text-sm";
const inputCompactFontClass = "md:text-xs";
// Adds the horizontal padding an overlay needs to sit flush on top of an Input.
const inputTextClass = `px-3 ${inputFontClass}`;

function Input({ className, type, ref, ...props }: React.ComponentProps<"input">) {
	const density = useDensity();
	return (
		<input
			ref={ref}
			type={type}
			data-slot="input"
			className={cn(
				"cn-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"selection:bg-primary selection:text-primary-foreground",
				inputTextClass,
				density === "compact" && cn("h-8", inputCompactFontClass),
				className,
			)}
			{...props}
		/>
	);
}

export { Input, inputCompactFontClass, inputFontClass, inputTextClass };
