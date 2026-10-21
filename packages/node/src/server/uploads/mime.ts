/** Leading bytes of the binary formats an upload is checked against (finfo's job in PHP). */
const SIGNATURES: [string, number, number[]][] = [
	["image/png", 0, [0x89, 0x50, 0x4e, 0x47]],
	["image/jpeg", 0, [0xff, 0xd8, 0xff]],
	["image/gif", 0, [0x47, 0x49, 0x46, 0x38]],
	["image/bmp", 0, [0x42, 0x4d]],
	["application/pdf", 0, [0x25, 0x50, 0x44, 0x46]],
	["application/zip", 0, [0x50, 0x4b, 0x03, 0x04]],
	["application/gzip", 0, [0x1f, 0x8b]],
	["video/webm", 0, [0x1a, 0x45, 0xdf, 0xa3]],
	["audio/mpeg", 0, [0x49, 0x44, 0x33]],
	["audio/ogg", 0, [0x4f, 0x67, 0x67, 0x53]],
];

const RIFF: [string, string][] = [
	["WEBP", "image/webp"],
	["WAVE", "audio/wav"],
	["AVI ", "video/x-msvideo"],
];

const ascii = (bytes: Uint8Array, from: number, to: number) =>
	String.fromCharCode(...bytes.subarray(from, to));

/**
 * The type the content says it is. Known binaries by signature, markup by its
 * text; anything else keeps the client's claim, which MimePolicy still filters.
 */
export function sniffMime(bytes: Uint8Array, claimed: string): string {
	const signed = SIGNATURES.find(([, at, sig]) => sig.every((b, i) => bytes[at + i] === b));
	if (signed !== undefined) {
		return signed[0];
	}
	if (ascii(bytes, 0, 4) === "RIFF") {
		return RIFF.find(([tag]) => ascii(bytes, 8, 12) === tag)?.[1] ?? "application/octet-stream";
	}
	if (ascii(bytes, 4, 8) === "ftyp") {
		return isoType(ascii(bytes, 8, 12));
	}
	return (
		markupType(new TextDecoder().decode(bytes.subarray(0, 1024))) ??
		(claimed || "application/octet-stream")
	);
}

function isoType(brand: string): string {
	if (brand.startsWith("avi")) {
		return "image/avif";
	}
	return brand.startsWith("hei") || brand === "mif1" ? "image/heic" : "video/mp4";
}

function markupType(head: string): string | null {
	const text = head
		.replace(/^\uFEFF/, "")
		.trimStart()
		.toLowerCase();
	// An SVG root (scripts and all: the sanitizer strips them) wins over the HTML sniff.
	if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/.test(text)) {
		return "image/svg+xml";
	}
	if (/^<!doctype html|^<html|<script|<body|<iframe/.test(text)) {
		return "text/html";
	}
	return text.startsWith("<?xml") ? "application/xml" : null;
}

/** MimePolicy::allows(): never active markup (SVG aside), then the accept globs; none = all. */
export function allowsMime(mime: string, accept: string[]): boolean {
	if (isActiveMarkup(mime)) {
		return false;
	}
	return accept.length === 0 || accept.some((pattern) => glob(pattern).test(mime));
}

function isActiveMarkup(mime: string): boolean {
	const type = mime.split(";", 1)[0]?.trim().toLowerCase() ?? "";
	if (type === "image/svg+xml") {
		return false;
	}
	const markup = [
		"text/html",
		"text/xml",
		"text/xsl",
		"application/xml",
		"application/xhtml+xml",
	];
	return markup.includes(type) || type.endsWith("+xml");
}

function glob(pattern: string): RegExp {
	const escaped = pattern.trim().replaceAll(/[.+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`^${escaped.replaceAll("*", ".*")}$`, "i");
}
