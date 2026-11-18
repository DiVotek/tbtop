import "./lexicalCore";
import { $isCodeNode } from "@lexical/code";
import { createLinkMatcherWithRegExp, type LinkMatcher, registerAutoLink } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { ElementNode } from "lexical";
import { useEffect } from "react";

// Typed or pasted URLs and emails turn into links as the author writes. The
// patterns follow the Lexical playground's; LinkNode.sanitizeUrl still checks
// every href, so these only decide what counts as a link, not what is safe.
// Trailing sentence punctuation (`.`, `?`, `)`…) stays outside the link, and
// quoted email local parts are not matched: they could span unrelated words.

const URL_REGEX =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(?<![-.+():%?&])/;

const EMAIL_REGEX =
	/([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

export const AUTO_LINK_MATCHERS: LinkMatcher[] = [
	createLinkMatcherWithRegExp(URL_REGEX, (text) =>
		text.startsWith("http") ? text : `https://${text}`,
	),
	createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => `mailto:${text}`),
];

// Code is shown verbatim: a URL inside a code block stays plain text.
export const AUTO_LINK_EXCLUDED_PARENTS = [(parent: ElementNode) => $isCodeNode(parent)];

// What may sit right after a link. Lexical's default (`.,;` and whitespace)
// leaves "see https://example.com?" unlinked, because the trailing `?` the
// URL pattern refuses is not a separator.
export const AUTO_LINK_SEPARATORS = /[.,;:!?)\s]/;

export const AUTO_LINK_CONFIG = {
	matchers: AUTO_LINK_MATCHERS,
	excludeParents: AUTO_LINK_EXCLUDED_PARENTS,
	separatorRegex: AUTO_LINK_SEPARATORS,
	changeHandlers: [],
};

// The React AutoLinkPlugin takes no separator option, so register directly.
export function RichtextAutoLinkPlugin() {
	const [editor] = useLexicalComposerContext();
	useEffect(() => registerAutoLink(editor, AUTO_LINK_CONFIG), [editor]);
	return null;
}
