import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: visuals come from the `cn-toggle*` / `cn-toggle-group*` rules
// in `ui/presets/style-preset-*.css`. Ours is always upstream's segmented
// form (outline variant, zero spacing, small size), so the variant/size/
// spacing props and context are not ported — the matching data attributes
// are fixed instead. Deltas: the selected item keeps our primary fill
// (upstream uses a muted one), and the joined-border classes are plain
// Tailwind because upstream keys them off shadcn's `data-horizontal` variant,
// which our Radix packages don't emit.
function ToggleGroup({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-variant="outline"
			data-size="sm"
			data-spacing={0}
			className={cn(
				// w-fit: a flex box blockifies inside a flex parent, where the
				// default stretch would otherwise widen the group to the column.
				"cn-toggle-group group/toggle-group flex w-fit flex-row items-center",
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
			data-variant="outline"
			data-size="sm"
			data-spacing={0}
			className={cn(
				"cn-toggle group/toggle inline-flex items-center justify-center whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"cn-toggle-variant-outline cn-toggle-size-sm",
				"cn-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
				"data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleGroup, ToggleGroupItem };
