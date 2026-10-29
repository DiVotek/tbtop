import { sanitizeHtml } from "./htmlSanitizer";
import { WhenGate } from "./inclusion";
import { Node } from "./node";

/**
 * The display blocks (TextBlock.php, HtmlBlock.php, …). Immutable like their
 * PHP twins: each modifier returns a copy, so a shared block stays unchanged.
 */
abstract class Block {
	private gate = new WhenGate();

	/** Server-side existence gate: false drops the block from the wire. */
	when(condition: boolean | (() => unknown)): this {
		this.gate.set(condition);
		return this;
	}

	isIncluded(): boolean {
		return this.gate.isIncluded();
	}

	protected copy(patch: Record<string, unknown>): this {
		const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this, patch);
		copy.gate = this.gate.clone();
		return copy;
	}

	abstract toNode(): Node;

	toJSON(): unknown {
		return this.toNode().toJSON();
	}
}

export type TextVariant = "heading" | "subheading" | "body" | "muted";

/** Static display text. There is no bare heading(): use variant('heading'). */
export class TextBlock extends Block {
	private variantValue: TextVariant = "body";

	constructor(private readonly content: string) {
		super();
	}

	/** Typographic style applied to the rendered text. */
	variant(variant: TextVariant): this {
		return this.copy({ variantValue: variant });
	}

	toNode(): Node {
		return new Node("displayText", { content: this.content, variant: this.variantValue });
	}
}

/**
 * HTML, sanitized server-side by default (the W3C safe baseline, as
 * symfony/html-sanitizer in HtmlBlock.php): scripts, event handlers, iframes
 * and javascript: URLs are dropped, and so are class, style, data-* and inline
 * SVG, so the content may come from a record. trusted() emits it unchanged.
 * Input over 1 MB is cut before sanitizing.
 */
export class HtmlBlock extends Block {
	private trustedValue = false;

	constructor(private readonly html: string) {
		super();
	}

	/** Skip sanitizing and emit the HTML as given; for author-controlled markup only. */
	trusted(): this {
		return this.copy({ trustedValue: true });
	}

	toNode(): Node {
		return new Node("displayHtml", {
			html: this.trustedValue ? this.html : sanitizeHtml(this.html),
		});
	}
}

/** Inline alert/callout box. */
export class AlertBlock extends Block {
	private titleValue: string | null = null;
	private colorValue = "info";

	constructor(private readonly message: string) {
		super();
	}

	/** Optional heading above the message; null clears it. */
	title(title: string | null): this {
		return this.copy({ titleValue: title });
	}

	/** Alert tint (info/success/warning/danger). Defaults to 'info'. */
	color(color: string): this {
		return this.copy({ colorValue: color });
	}

	toNode(): Node {
		const options: Record<string, unknown> = { message: this.message, color: this.colorValue };
		if (this.titleValue !== null) {
			options.title = this.titleValue;
		}
		return new Node("displayAlert", options);
	}
}

/** Read-only full-size image, or a file-download link via asLink(). */
export class DisplayImageBlock extends Block {
	private altValue: string | null = null;
	private captionValue: string | null = null;
	private asLinkValue = false;
	private shapeValue: "square" | "circular" | null = null;

	constructor(private readonly src: string) {
		super();
	}

	/** Accessible alt text for the rendered image. */
	alt(alt: string): this {
		return this.copy({ altValue: alt });
	}

	/** Caption text rendered below the image/link. */
	caption(caption: string): this {
		return this.copy({ captionValue: caption });
	}

	/** Render as a file-download link instead of an inline image. */
	asLink(): this {
		return this.copy({ asLinkValue: true });
	}

	/** Square image shape (sharp corners). Last shape call wins. */
	square(): this {
		return this.copy({ shapeValue: "square" });
	}

	/** Circular image shape. Last shape call wins. */
	circular(): this {
		return this.copy({ shapeValue: "circular" });
	}

	toNode(): Node {
		const options: Record<string, unknown> = { src: this.src };
		if (this.altValue !== null) {
			options.alt = this.altValue;
		}
		if (this.captionValue !== null) {
			options.caption = this.captionValue;
		}
		if (this.asLinkValue) {
			options.asLink = true;
		}
		if (this.shapeValue !== null) {
			options.shape = this.shapeValue;
		}
		return new Node("displayImage", options);
	}
}

/** Read-only render of a stored Lexical editor state. */
export class DisplayRichtextBlock extends Block {
	constructor(private readonly state: Record<string, unknown>) {
		super();
	}

	toNode(): Node {
		return new Node("displayRichtext", { state: this.state });
	}
}

/** Read-only `<dl>` of key/value pairs. */
export class DisplayKeyValueBlock extends Block {
	constructor(private readonly map: Record<string, unknown>) {
		super();
	}

	toNode(): Node {
		return new Node("displayKeyValue", { entries: this.map });
	}
}

export { Block };
