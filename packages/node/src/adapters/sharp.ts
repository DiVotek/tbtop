import type { ImageConverter } from "../server/uploads/config";

const FORMATS = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" } as const;

type Format = keyof typeof FORMATS;

/** The slice of sharp's API the converter calls. */
interface SharpLike {
	(
		input: Uint8Array,
	): {
		toFormat(
			format: Format,
			options: { quality?: number },
		): { toBuffer(): Promise<Uint8Array> };
	};
}

/**
 * Upload conversion on sharp (libvips): Bun and Node only, it is native. The
 * host installs sharp and passes the module: `sharpImages((await import("sharp")).default)`.
 */
export function sharpImages(sharp: SharpLike): ImageConverter {
	return async (bytes, { format, quality }) => {
		if (!(format in FORMATS)) {
			return null;
		}
		const target = format as Format;
		const options = quality === undefined ? {} : { quality };
		const out = await sharp(bytes)
			.toFormat(target, options)
			.toBuffer()
			.catch(() => null);
		return out === null
			? null
			: {
					bytes: new Uint8Array(out),
					mimeType: FORMATS[target],
					ext: target === "jpeg" ? "jpg" : target,
				};
	};
}
