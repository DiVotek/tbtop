import { trans } from "../../i18n";
import { HttpError } from "../http";
import { diskFor, type FieldConfig, type UploadOptions } from "./config";
import { allowsMime, sniffMime } from "./mime";
import type { Bytes } from "./storage";

export interface StoredFile {
	path: string;
	url: string;
}

const EXTENSIONS: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/avif": "avif",
	"image/svg+xml": "svg",
	"application/pdf": "pdf",
};

const reject = (key: string) => new HttpError(422, trans(key));

/**
 * FieldUploadController + UploadStorer: size and type checks on the content,
 * SVG sanitizing, optional conversion, then one write to the field's disk.
 */
export async function storeUpload(
	file: File,
	config: FieldConfig,
	options: UploadOptions,
): Promise<StoredFile> {
	if (file.size > config.maxSize) {
		throw reject("media.errors.file_too_large");
	}
	let bytes: Bytes = new Uint8Array(await file.arrayBuffer());
	let mime = sniffMime(bytes, file.type);
	if (!allowsMime(mime, config.accept)) {
		throw new HttpError(422, `File type ${mime} is not allowed.`);
	}
	if (mime === "image/svg+xml") {
		bytes = await sanitizedSvg(bytes, options);
	}
	const converted =
		mime.startsWith("image/") && config.image ? await convert(bytes, config, options) : null;
	if (converted !== null) {
		({ bytes, mimeType: mime } = converted);
	}
	const disk = diskFor(options, config);
	const path = `${config.directory.replaceAll(/^\/+|\/+$/g, "")}/${hashName()}.${converted?.ext ?? extension(file, mime)}`;
	await disk.put(path, bytes, { contentType: mime });
	return { path, url: disk.url(path) };
}

async function sanitizedSvg(bytes: Bytes, options: UploadOptions): Promise<Bytes> {
	if (options.sanitizeSvg === undefined) {
		throw reject("media.errors.mime_not_allowed");
	}
	const clean = await options.sanitizeSvg(new TextDecoder().decode(bytes));
	if (!clean.includes("<svg")) {
		throw reject("media.errors.svg_invalid");
	}
	return new TextEncoder().encode(clean) as Bytes;
}

function convert(bytes: Bytes, config: FieldConfig, options: UploadOptions) {
	return options.images === undefined || config.image === null
		? Promise.resolve(null)
		: options.images(bytes, config.image);
}

/** Str::random(40), as UploadedFile::hashName(). */
function hashName(): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	return [...crypto.getRandomValues(new Uint8Array(40))].map((b) => alphabet[b % 62]).join("");
}

/** From the sniffed type; else the client's extension, letters and digits only. */
function extension(file: File, mime: string): string {
	const known = EXTENSIONS[mime];
	if (known !== undefined) {
		return known;
	}
	const own = file.name.split(".").at(-1)?.toLowerCase() ?? "";
	return /^[a-z0-9]{1,8}$/.test(own) && own !== file.name.toLowerCase() ? own : "bin";
}
