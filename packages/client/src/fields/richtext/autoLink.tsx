import "./lexicalCore";
import { $isCodeNode } from "@lexical/code";
import { createLinkMatcherWithRegExp, type LinkMatcher } from "@lexical/link";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import type { ElementNode } from "lexical";

// Typed or pasted URLs and emails turn into links as the author writes. The
// patterns follow the Lexical playground's; LinkNode.sanitizeUrl still checks
// every href, so these only decide what counts as a link, not what is safe.

const URL_REGEX =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(?<![-.+():%])/;

const EMAIL_REGEX =
	/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

export const AUTO_LINK_MATCHERS: LinkMatcher[] = [
	createLinkMatcherWithRegExp(URL_REGEX, (text) =>
		text.startsWith("http") ? text : `https://${text}`,
	),
	createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => `mailto:${text}`),
];

// Code is shown verbatim: a URL inside a code block stays plain text.
export const AUTO_LINK_EXCLUDED_PARENTS = [(parent: ElementNode) => $isCodeNode(parent)];

export function RichtextAutoLinkPlugin() {
	return (
		<AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} excludeParents={AUTO_LINK_EXCLUDED_PARENTS} />
	);
}
