import MarkdownIt from "markdown-it";
import { Block } from "./blocks";
import { Node } from "./node";

/**
 * Markdown rendered to HTML server-side, shipped as `displayHtml`
 * (MarkdownBlock.php). Embedded HTML is escaped unless allowHtml().
 */
export class MarkdownBlock extends Block {
	private allowHtmlValue = false;

	constructor(private readonly markdown: string) {
		super();
	}

	/** Pass raw HTML in the source through unchanged; trusted content only. */
	allowHtml(): this {
		return this.copy({ allowHtmlValue: true });
	}

	toNode(): Node {
		const renderer = new MarkdownIt({ html: this.allowHtmlValue, linkify: false });
		return new Node("displayHtml", { html: renderer.render(this.markdown) });
	}
}
