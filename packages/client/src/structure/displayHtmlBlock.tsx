import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayHtmlOptions {
	html: string;
}

// Content is author-supplied from the DSL, not end-user input — no
// sanitization is needed or applied here.
export function DisplayHtmlBlock({ options }: RenderProps<DisplayHtmlOptions>) {
	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: DSL-authored content, not user input
		<div dangerouslySetInnerHTML={{ __html: options.html }} />
	);
}

export const displayHtmlBlockDescriptor = defineBlock<"displayHtml", DisplayHtmlOptions>(
	"displayHtml",
	{ behavior: "leaf", render: DisplayHtmlBlock },
);
