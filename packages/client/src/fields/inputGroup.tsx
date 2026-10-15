import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { renderNode } from "../render/structureRenderer";
import type { StructureNode } from "../structure/structure";

// New-gen shape: structural classes live here as `cn-input-group*` names, the
// visual definition (border, background, height, addon padding/typography)
// lives in `ui/presets/style-preset-*.css`. Our deltas on top of upstream:
// - the control slot wraps our own primitives (Input, Select trigger, the
//   multi-select shell) and strips their frame so the group owns it;
// - focus/invalid styling keys on `focus-within` / `data-invalid`, because the
//   preset's rules key on `data-slot=input-group-control`, which our nested
//   primitives do not emit (their slots are `input` / `select-trigger`);
// - a multi-select grows the group (`h-auto`) instead of the preset's fixed height;
// - affixes render arbitrary StructureNodes, so the addon has no click-to-focus.
// The presets sit in the `components` cascade layer, below `utilities`, so
// these overrides win without `!`.

export interface AffixOptions {
	prefix?: StructureNode;
	suffix?: StructureNode;
}

interface InputGroupProps {
	children: ReactNode;
	options?: AffixOptions;
	disabled?: boolean;
	invalid?: boolean;
}

export function InputGroup({ children, options, disabled, invalid }: InputGroupProps) {
	if (!options?.prefix && !options?.suffix) {
		return <>{children}</>;
	}

	return (
		<div
			data-slot="input-group"
			role="group"
			data-disabled={disabled || undefined}
			data-invalid={invalid || undefined}
			className={cn(
				"cn-input-group group/input-group relative flex w-full min-w-0 items-stretch outline-none",
				"has-[[data-slot=select-multi-control]]:h-auto",
				"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50",
				"data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
				"data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40",
			)}
		>
			{options.prefix && <InputGroupAddon align="inline-start" node={options.prefix} />}
			<div
				className={cn(
					"min-w-0 flex-1 [&>*]:w-full",
					"[&_[data-slot=input]]:h-full [&_[data-slot=input]]:rounded-none [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:focus-visible:ring-0 [&_[data-slot=input]]:aria-invalid:ring-0",
					"[&_[data-slot=select-trigger]]:h-full [&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=select-trigger]]:focus-visible:ring-0 [&_[data-slot=select-trigger]]:aria-invalid:ring-0",
					"[&_[data-slot=select-multi-control]]:rounded-none [&_[data-slot=select-multi-control]]:border-0",
				)}
			>
				{children}
			</div>
			{options.suffix && <InputGroupAddon align="inline-end" node={options.suffix} />}
		</div>
	);
}

const addonAlignClass = {
	"inline-start": "cn-input-group-addon-align-inline-start order-first",
	"inline-end": "cn-input-group-addon-align-inline-end order-last",
} as const;

function InputGroupAddon({
	align,
	node,
}: {
	align: keyof typeof addonAlignClass;
	node: StructureNode;
}) {
	return (
		<div
			data-slot="input-group-addon"
			data-align={align}
			className={cn(
				"cn-input-group-addon flex shrink-0 items-center justify-center select-none",
				addonAlignClass[align],
			)}
		>
			{renderNode(node)}
		</div>
	);
}
