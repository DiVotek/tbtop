import * as SliderPrimitive from "@radix-ui/react-slider";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: visuals come from the `cn-slider*` rules in
// `ui/presets/style-preset-*.css`. Deltas on top of upstream: a single thumb
// (upstream renders one per value for ranges; no caller passes a range), and
// `data-[orientation=…]` sizing duplicates the preset's orientation rules
// for Radix, which emits `data-orientation` (see the `data-horizontal` /
// `data-vertical` variants in styles.css).
function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				"cn-slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="cn-slider-track relative grow overflow-hidden data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full"
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className="cn-slider-range absolute select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
				/>
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				className="cn-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
			/>
		</SliderPrimitive.Root>
	);
}

export { Slider };
