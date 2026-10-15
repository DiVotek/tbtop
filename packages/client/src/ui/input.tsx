import type * as React from "react";

import { useDensity } from "../app/densityContext";
import { cn } from "../lib/cn";

// New-gen shape: structural classes live here, the visual definition is the
// `cn-input` rule in `ui/presets/style-preset-*.css`. Our deltas on top of
// upstream: the exported font/overlay helpers, selection colors, the iOS
// font floor, and density-aware compact sizing. Padding and font come from
// the preset, so overlays borrow `cn-input` itself to sit flush.

// text-base below md keeps iOS Safari from zooming the viewport on focus, so
// any control holding a text cursor must carry these instead of a bare text-sm.
const inputFontClass = "text-base md:text-sm";
const inputCompactFontClass = "md:text-xs";
// Mobile-only floor: on desktop the preset's own input font size stands.
const inputMobileFontClass = "max-md:text-base";
// An overlay laid over an Input: the preset's padding and font, none of its chrome.
const inputTextClass = `cn-input h-auto border-transparent bg-transparent shadow-none dark:bg-transparent ${inputMobileFontClass}`;

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
				inputMobileFontClass,
				density === "compact" && cn("h-8", inputCompactFontClass),
				className,
			)}
			{...props}
		/>
	);
}

export { Input, inputCompactFontClass, inputFontClass, inputTextClass };
