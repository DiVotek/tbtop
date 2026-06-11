import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

export function DisplayDividerBlock(_props: RenderProps<Record<string, never>>) {
	return <div className="border-t border-border" data-testid="display-divider-block" />;
}

export const displayDividerBlockDescriptor = defineBlock<"displayDivider", Record<string, never>>(
	"displayDivider",
	{ behavior: "leaf", render: DisplayDividerBlock },
);
