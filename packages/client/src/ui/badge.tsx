import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: structural classes live here as `cn-*` names, the visual
// definitions live in `ui/presets/style-preset-*.css`. Our delta on top of
// upstream: the `counter` size (16px notification dots) has no upstream
// equivalent, so it is plain utilities, which beat the preset layer.
const badgeVariants = cva(
	"cn-badge group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap [&>svg]:pointer-events-none",
	{
		variants: {
			variant: {
				default: "cn-badge-variant-default",
				secondary: "cn-badge-variant-secondary",
				destructive: "cn-badge-variant-destructive",
				outline: "cn-badge-variant-outline",
				ghost: "cn-badge-variant-ghost",
				link: "cn-badge-variant-link",
			},
			size: {
				default: "",
				// Digits in a 16px circle: text-xs (12px) overflows it, and the
				// Tailwind type scale stops there.
				counter: "h-4 min-w-4 px-1 text-[10px] leading-none tabular-nums",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Badge({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			data-size={size}
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
