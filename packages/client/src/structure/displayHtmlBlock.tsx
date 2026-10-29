import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayHtmlOptions {
	html: string;
}

// The server sanitizes displayHtml unless the author opted out with
// ->trusted(), so the client renders it as given.
export function DisplayHtmlBlock({ options }: RenderProps<DisplayHtmlOptions>) {
	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side (HtmlBlock)
		<div dangerouslySetInnerHTML={{ __html: options.html }} />
	);
}

export const displayHtmlBlockDescriptor = defineBlock<"displayHtml", DisplayHtmlOptions>(
	"displayHtml",
	{ behavior: "leaf", render: DisplayHtmlBlock },
);
