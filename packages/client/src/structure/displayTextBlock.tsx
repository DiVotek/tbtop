import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

type TextVariant = "heading" | "subheading" | "body" | "muted";

interface DisplayTextOptions {
	content: string;
	variant?: TextVariant;
}

// Static class map — Tailwind only emits classes it sees verbatim in source.
const VARIANT_CLASSES: Record<TextVariant, string> = {
	heading: "text-2xl font-bold",
	subheading: "text-lg font-semibold",
	body: "text-sm",
	muted: "text-sm text-muted-foreground",
};

export function DisplayTextBlock({ options }: RenderProps<DisplayTextOptions>) {
	const variant = options.variant ?? "body";
	const className = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.body;
	return <p className={className}>{options.content}</p>;
}

export const displayTextBlockDescriptor = defineBlock<"displayText", DisplayTextOptions>(
	"displayText",
	{ behavior: "leaf", render: DisplayTextBlock },
);
