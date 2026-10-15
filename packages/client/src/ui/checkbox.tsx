import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/cn";

// New-gen shape: structural classes live here as `cn-*` names, the visual
// definitions live in `ui/presets/style-preset-*.css`. Our deltas on top of
// upstream: the indeterminate state (minus icon + filled styling) and no
// enlarged `after:` hit area (it would overlap neighbouring table cells).
const radixCheckedState =
	"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"cn-checkbox peer shrink-0 outline-none disabled:cursor-not-allowed disabled:opacity-50",
				radixCheckedState,
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="cn-checkbox-indicator grid place-content-center text-current transition-none"
			>
				{props.checked === "indeterminate" ? <MinusIcon /> : <CheckIcon />}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
