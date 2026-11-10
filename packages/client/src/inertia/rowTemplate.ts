import type { ClientActionContext } from "../structure/types";

/**
 * Row values are consumer data (slugs, titles, ids from arbitrary tables), so
 * a value containing '/', '?', '#', or '&' must not be able to reshape the
 * template's own URL structure — encode it so it fills exactly one segment.
 */
export function fillRowTemplate(template: string, ctx: ClientActionContext): string {
	return template.replaceAll(/\{row\.([a-zA-Z0-9_]+)\}/g, (placeholder, key: string) => {
		const value = ctx.row?.[key];
		return value === undefined ||
			value === null ||
			(typeof value === "string" && value.trim() === "")
			? placeholder
			: encodeURIComponent(toWellFormedString(String(value)));
	});
}

/**
 * encodeURIComponent throws a URIError on a lone UTF-16 surrogate. Row values
 * come from arbitrary JSON payloads, where a lone surrogate is a valid string
 * (e.g. `"\uD800"`), so replace unpaired surrogates with U+FFFD before
 * encoding rather than letting a malformed value crash the render.
 */
function toWellFormedString(value: string): string {
	return value.replaceAll(
		/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
		"�",
	);
}
