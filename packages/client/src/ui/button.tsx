import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { useDensity } from "../app/densityContext";
import { cn } from "../lib/cn";

// New-gen shape: structural classes live here as `cn-*` names, the visual
// definitions live in `ui/presets/style-preset-*.css`. Our deltas on top of
// upstream: `plain` + `full` variants, `icon-xs`/`icon-sm`/`icon-lg` sizes
// beyond upstream's single `icon`, density-aware default size, and
// `data-variant` / `data-size` attributes (used by table cell overrides).
const buttonVariants = cva(
	"cn-button group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "cn-button-variant-default",
				destructive: "cn-button-variant-destructive",
				outline: "cn-button-variant-outline",
				secondary: "cn-button-variant-secondary",
				ghost: "cn-button-variant-ghost",
				link: "cn-button-variant-link",
				// No background/border/shadow — the trigger reads as plain text.
				// Used where a surrounding element (e.g. a grid cell) already
				// carries the interactive chrome and hover state. No upstream
				// equivalent: falls back to unstyled (only base cn-button).
				plain: "justify-start font-medium",
			},
			size: {
				default: "cn-button-size-default",
				xs: "cn-button-size-xs",
				sm: "cn-button-size-sm",
				lg: "cn-button-size-lg",
				icon: "cn-button-size-icon",
				"icon-xs": "cn-button-size-icon-xs",
				"icon-sm": "cn-button-size-icon-sm",
				"icon-lg": "cn-button-size-icon-lg",
				// Full-bleed reset (dropdown-menu items). Not a visual size —
				// keeps specificity low so the host row controls layout.
				full: "h-auto w-full p-0",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size,
	asChild = false,
	type,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const density = useDensity();
	// Explicit `size` always wins; compact density only changes the default.
	const resolvedSize = size ?? (density === "compact" ? "sm" : "default");
	const Comp = asChild ? Slot : "button";
	const resolvedType = asChild ? type : (type ?? "button");

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={resolvedSize}
			className={cn(
				buttonVariants({ variant, size: resolvedSize }),
				size === undefined && density === "compact" && "text-xs shadow-sm",
				className,
			)}
			{...(resolvedType !== undefined ? { type: resolvedType } : {})}
			{...props}
		/>
	);
}

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

export { Button, type ButtonProps, buttonVariants };
