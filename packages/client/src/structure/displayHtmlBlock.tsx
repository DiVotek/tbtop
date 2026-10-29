import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayHtmlOptions {
	html: string;
}

// The client renders html as given. The server produces it: displayHtml()
// sanitizes unless the author chains ->trusted(), and markdown() strips raw
// HTML unless the author chains ->allowHtml(). Both opt-outs are for
// author-controlled content only.
export function DisplayHtmlBlock({ options }: RenderProps<DisplayHtmlOptions>) {
	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side unless the author opted out
		<div dangerouslySetInnerHTML={{ __html: options.html }} />
	);
}

export const displayHtmlBlockDescriptor = defineBlock<"displayHtml", DisplayHtmlOptions>(
	"displayHtml",
	{ behavior: "leaf", render: DisplayHtmlBlock },
);
