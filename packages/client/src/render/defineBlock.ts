import type { ComponentType } from "react";
import { type BlockDescriptor, type RenderProps, registerBlock } from "./blockRegistry";

export function defineBlock<TKind extends string, TOptions>(
	kind: TKind,
	descriptor: {
		behavior: "leaf" | "container" | "field";
		render: ComponentType<RenderProps<TOptions>>;
		defaultOptions?: Partial<TOptions>;
		serialize?: (value: unknown, options: TOptions) => unknown;
	},
): BlockDescriptor<TKind, TOptions> {
	return registerBlock<TKind, TOptions>({
		kind,
		behavior: descriptor.behavior,
		render: descriptor.render,
		defaultOptions: descriptor.defaultOptions,
		serialize: descriptor.serialize,
	});
}
