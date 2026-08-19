import type { RenderProps } from "../render/blockRegistry";
import { defineBlock } from "../render/defineBlock";

interface DisplayHtmlOptions {
	html: string;
}

const ALLOWED_TAGS = new Set([
	"a",
	"blockquote",
	"br",
	"code",
	"div",
	"em",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"hr",
	"img",
	"li",
	"ol",
	"p",
	"pre",
	"span",
	"strong",
	"table",
	"tbody",
	"td",
	"th",
	"thead",
	"tr",
	"ul",
]);

const ALLOWED_ATTRIBUTES = new Set([
	"alt",
	"colspan",
	"height",
	"href",
	"rowspan",
	"src",
	"title",
	"width",
]);
const URL_ATTRIBUTES = new Set(["href", "src"]);
const ALLOWED_PROTOCOLS = new Set(["http", "https", "mailto", "tel"]);

function isSafeUrl(value: string): boolean {
	if (
		Array.from(value).some((character) => {
			const code = character.charCodeAt(0);
			return code <= 0x1f || code === 0x7f;
		})
	) {
		return false;
	}
	const scheme = value.trim().match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
	return scheme === undefined || ALLOWED_PROTOCOLS.has(scheme.toLowerCase());
}

function copySafeNode(node: Node, target: Document): Node | null {
	if (node.nodeType === Node.TEXT_NODE) {
		return target.createTextNode(node.textContent ?? "");
	}
	if (!(node instanceof Element) || !ALLOWED_TAGS.has(node.tagName.toLowerCase())) {
		return null;
	}

	const clean = target.createElement(node.tagName.toLowerCase());
	for (const attribute of node.attributes) {
		const name = attribute.name.toLowerCase();
		if (
			ALLOWED_ATTRIBUTES.has(name) &&
			(!URL_ATTRIBUTES.has(name) || isSafeUrl(attribute.value))
		) {
			clean.setAttribute(name, attribute.value);
		}
	}
	for (const child of node.childNodes) {
		const safeChild = copySafeNode(child, target);
		if (safeChild) {
			clean.append(safeChild);
		}
	}
	return clean;
}

export function sanitizeHtml(html: string): string {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	const clean = document.implementation.createHTMLDocument();
	for (const child of parsed.body.childNodes) {
		const safeChild = copySafeNode(child, clean);
		if (safeChild) {
			clean.body.append(safeChild);
		}
	}
	return clean.body.innerHTML;
}

export function DisplayHtmlBlock({ options }: RenderProps<DisplayHtmlOptions>) {
	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: content is allowlist-sanitized immediately above
		<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(options.html) }} />
	);
}

export const displayHtmlBlockDescriptor = defineBlock<"displayHtml", DisplayHtmlOptions>(
	"displayHtml",
	{ behavior: "leaf", render: DisplayHtmlBlock },
);
