import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type * as React from "react";

import { cn } from "../lib/cn";

function ToggleGroup({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			className={cn(
				// w-fit: inline-flex blockifies inside a flex parent, where the
				// default stretch would otherwise widen the group to the column.
				"inline-flex w-fit items-center rounded-md border border-input shadow-xs",
				className,
			)}
			{...props}
		/>
	);
}

function ToggleGroupItem({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			className={cn(
				"inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors outline-none first:rounded-l-sm last:rounded-r-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&:not(:first-child)]:border-l [&:not(:first-child)]:border-input",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleGroup, ToggleGroupItem };
