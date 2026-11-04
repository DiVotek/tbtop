import { DomUtils, parseDocument } from "htmlparser2";

/**
 * The displayHtml sanitizer, mirroring HtmlBlock.php's symfony/html-sanitizer
 * config: the W3C safe baseline (allowSafeElements), links over
 * http/https/mailto/tel, media over http/https, relative URLs allowed, input
 * cut at 1 MB. An element off the list is dropped with its children; an
 * attribute off the list is dropped. Text and attribute values are re-escaped.
 */

type DomNode = ReturnType<typeof parseDocument>["children"][number];

/** Sanitizer input cap in UTF-8 bytes; longer HTML is cut before it is parsed. */
export const MAX_INPUT_BYTES = 1_000_000;

const ELEMENTS = new Set(
	(
		"head link meta title a abbr acronym address area article aside audio b basefont bdi bdo big " +
		"blockquote body br button canvas caption center cite code col colgroup command data datalist " +
		"dd del details dfn dialog dir div dl dt em fieldset figcaption figure font footer h1 h2 h3 h4 " +
		"h5 h6 header hgroup hr html i image img ins kbd keygen label layer legend li listing main map " +
		"mark marquee menu meter nav nobr ol optgroup option output p picture plaintext popup portal " +
		"pre progress q rb rp rt rtc ruby s samp section slot small source span strike strong sub " +
		"summary sup table tbody td template tfoot th thead time tr track tt u ul var video wbr xmp"
	).split(" "),
);

const ATTRIBUTES = new Set(
	(
		"abbr accept accept-charset accesskey action align alink allow allowfullscreen alt anchor " +
		"archive as axis behavior capture cellpadding cellspacing challenge char charoff charset cite " +
		"clear code codebase codetype cols colspan compact content controls controlslist " +
		"conversiondestination coords crossorigin csp data datetime declare decoding default defer " +
		"dir direction dirname disabled disablepictureinpicture disableremoteplayback " +
		"disallowdocumentaccess download draggable elementtiming enctype end enterkeyhint event " +
		"exportparts face for headers height high href hreflang hreftranslate hspace id imagesizes " +
		"imagesrcset importance impressiondata impressionexpiry incremental inert inputmode integrity " +
		"invisible is ismap keytype kind label lang language latencyhint leftmargin link list loading " +
		"longdesc loop low lowsrc manifest marginheight marginwidth max maxlength mayscript media " +
		"method min minlength multiple muted name nohref nomodule nonce noresize noshade novalidate " +
		"nowrap object open optimum part pattern placeholder playsinline policy poster preload pseudo " +
		"readonly referrerpolicy rel reportingorigin required resources rev reversed role rows rowspan " +
		"rules sandbox scheme scope scopes scrollamount scrolldelay scrolling shadowroot " +
		"shadowrootdelegatesfocus shape size sizes slot span spellcheck src srclang srcset standby " +
		"start step summary tabindex target text title topmargin translate truespeed trusttoken type " +
		"usemap valign valuetype version virtualkeyboardpolicy vspace webkitdirectory width wrap"
	).split(" "),
);

const VOID = new Set(
	"area base br col embed hr image img input keygen link meta source track wbr".split(" "),
);

const LINK_SCHEMES = ["http:", "https:", "mailto:", "tel:"];
const MEDIA_SCHEMES = ["http:", "https:"];
/** Symfony's UrlAttributeSanitizer covers href/ping and src/lowsrc/background; the rest are extra. */
const LINK_ATTRIBUTES = new Set(["href", "ping", "cite", "longdesc", "action", "codebase"]);
const MEDIA_ATTRIBUTES = new Set(["src", "lowsrc", "poster", "data", "manifest", "archive"]);
const SRCSET_ATTRIBUTES = new Set(["srcset", "imagesrcset"]);

/** The HTML with everything off the safe baseline removed. */
export function sanitizeHtml(html: string): string {
	return parseDocument(truncate(html), { decodeEntities: true }).children.map(render).join("");
}

function truncate(html: string): string {
	if (html.length * 3 <= MAX_INPUT_BYTES) {
		return html;
	}
	const bytes = new TextEncoder().encode(html);
	return bytes.length <= MAX_INPUT_BYTES
		? html
		: new TextDecoder().decode(bytes.subarray(0, MAX_INPUT_BYTES)).replace(/�$/, "");
}

function render(node: DomNode): string {
	if (DomUtils.isText(node)) {
		return escape(node.data);
	}
	if (!DomUtils.isTag(node) || !ELEMENTS.has(node.name)) {
		return "";
	}
	const attrs = Object.entries(node.attribs)
		.map(([name, value]) => attribute(name, value))
		.join("");
	if (VOID.has(node.name)) {
		return `<${node.name}${attrs} />`;
	}
	return `<${node.name}${attrs}>${node.children.map(render).join("")}</${node.name}>`;
}

function attribute(name: string, value: string): string {
	const clean = attributeValue(name, value);
	return clean === null ? "" : ` ${name}="${escape(clean)}"`;
}

function attributeValue(name: string, value: string): string | null {
	if (!ATTRIBUTES.has(name)) {
		return null;
	}
	if (LINK_ATTRIBUTES.has(name)) {
		return safeUrl(value, LINK_SCHEMES);
	}
	if (MEDIA_ATTRIBUTES.has(name)) {
		return safeUrl(value, MEDIA_SCHEMES);
	}
	if (SRCSET_ATTRIBUTES.has(name)) {
		const candidates = value.split(",").map((c) => c.trim());
		const urls = candidates.map((c) => safeUrl(c.split(/\s+/)[0] ?? "", MEDIA_SCHEMES));
		return urls.every((url) => url !== null) ? candidates.join(", ") : null;
	}
	return value;
}

/** An absolute URL on an allowed scheme, or a relative one; null otherwise. */
function safeUrl(value: string, schemes: string[]): string | null {
	if (value.trim() === "") {
		return null;
	}
	if (!URL.canParse(value)) {
		// No scheme: relative, resolved against the page. A bad one has no scheme to abuse.
		return URL.canParse(value, "https://relative.invalid/") ? value : null;
	}
	return schemes.includes(new URL(value).protocol) ? value : null;
}

function escape(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}
