import type { Upload } from "../../dsl";
import type { Bytes, Disk } from "./storage";

/** Conversion of an uploaded image (GD in PHP); sharp, Cloudflare Images or a wasm codec. */
export type ImageConverter = (
	bytes: Bytes,
	target: { format: string; quality?: number },
) => Promise<{ bytes: Bytes; mimeType: string; ext: string } | null>;

export interface UploadOptions {
	/** Disks by name, as `disk()` names them; `public` is the default. */
	disks?: Record<string, Disk>;
	/** Signs private upload URLs (Laravel's APP_KEY); required once a field is private. */
	secret?: string;
	/** Runs when a field sets `convertTo()`; without it the original is kept. */
	images?: ImageConverter;
	/** SVG is active content: refused unless the host gives a sanitizer (DOMPurify, svg-sanitize). */
	sanitizeSvg?: (svg: string) => string | Promise<string>;
}

/** Form-field limit (UploadFieldConfig::DEFAULT_MAX_SIZE), in bytes like browser File.size. */
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

/** UploadFieldConfig::resolve(): inline DSL options only; the client cannot override them. */
export interface FieldConfig {
	disk: string;
	directory: string;
	visibility: "public" | "private";
	maxSize: number;
	accept: string[];
	image: { format: string; quality?: number } | null;
}

export function fieldConfig(field: Upload): FieldConfig {
	const options = field.toNode().options;
	return {
		disk: String(options.disk ?? "public"),
		directory: String(options.directory ?? "uploads"),
		visibility: options.visibility === "private" ? "private" : "public",
		maxSize: Number(options.maxSize ?? DEFAULT_MAX_SIZE),
		accept: acceptList(options.accept),
		image: imageTarget(options.image),
	};
}

function acceptList(accept: unknown): string[] {
	if (typeof accept === "string") {
		return accept.split(",").flatMap((part) => (part.trim() === "" ? [] : [part.trim()]));
	}
	return Array.isArray(accept) ? accept.map(String) : [];
}

function imageTarget(image: unknown): FieldConfig["image"] {
	const { convertTo, quality } = (image ?? {}) as { convertTo?: unknown; quality?: unknown };
	if (typeof convertTo !== "string") {
		return null;
	}
	return typeof quality === "number" ? { format: convertTo, quality } : { format: convertTo };
}

export function diskFor(options: UploadOptions, config: FieldConfig): Disk {
	const disk = options.disks?.[config.disk];
	if (disk === undefined) {
		throw new Error(
			`Upload disk "${config.disk}" is not configured: pass it in createAdmin({ disks }).`,
		);
	}
	return disk;
}
