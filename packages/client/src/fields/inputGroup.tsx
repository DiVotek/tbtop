import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { renderNode } from "../render/structureRenderer";
import type { StructureNode } from "../structure/structure";

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
			data-disabled={disabled || undefined}
			data-invalid={invalid || undefined}
			className={cn(
				"flex min-h-9 w-full min-w-0 items-stretch rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
				"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50",
				"data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
				"data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40",
				"dark:bg-input/30",
			)}
		>
			{options.prefix && <InputGroupAffix side="prefix" node={options.prefix} />}
			<div
				className={cn(
					"min-w-0 flex-1 [&>*]:w-full",
					"[&_[data-slot=input]]:h-full [&_[data-slot=input]]:rounded-none [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:focus-visible:ring-0",
					"[&_[data-slot=select-trigger]]:h-full [&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=select-trigger]]:focus-visible:ring-0",
					"[&_[data-slot=select-multi-control]]:rounded-none [&_[data-slot=select-multi-control]]:border-0",
				)}
			>
				{children}
			</div>
			{options.suffix && <InputGroupAffix side="suffix" node={options.suffix} />}
		</div>
	);
}

function InputGroupAffix({ side, node }: { side: "prefix" | "suffix"; node: StructureNode }) {
	return (
		<div
			data-slot={`input-group-${side}`}
			className={cn(
				"flex shrink-0 items-center text-sm text-muted-foreground",
				side === "prefix" ? "pl-3" : "pr-3",
			)}
		>
			{renderNode(node)}
		</div>
	);
}
