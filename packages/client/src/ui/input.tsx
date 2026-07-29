import type * as React from "react";

import { useDensity } from "../app/densityContext";
import { cn } from "../lib/cn";

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
				"h-9 w-full min-w-0 rounded-md border border-input bg-transparent py-1 shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
				inputTextClass,
				"focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				density === "compact" && cn("h-8", inputCompactFontClass),
				className,
			)}
			{...props}
		/>
	);
}

export { Input, inputCompactFontClass, inputFontClass, inputTextClass };
