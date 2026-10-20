import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: visuals come from the `cn-radio-group*` rules in
// `ui/presets/style-preset-*.css`; the dot is a styled span, as upstream.
// The checked fill is the preset's (core.css maps `data-checked` onto
// Radix's `data-state`).
function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			data-slot="radio-group"
			className={cn("cn-radio-group w-full", className)}
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				"cn-radio-group-item group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator
				data-slot="radio-group-indicator"
				className="cn-radio-group-indicator"
			>
				<span className="cn-radio-group-indicator-icon" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem };
