/** Wire shape of `options.image.crop` (Upload::crop / cropAspects / cropCircle). */
export interface CropOptions {
	aspects: string[];
	shape?: "rect" | "round";
}

/** One aspect choice in the dialog; `ratio` is undefined for free cropping. */
export interface AspectChoice {
	label: string;
	ratio: number | undefined;
}

/** Formats a browser cannot redraw without losing something (vector, animation). */
const PASSTHROUGH_TYPES = new Set(["image/svg+xml", "image/gif"]);

/** Parses wire aspects ('16:9' | 'free') into dialog choices, dropping malformed entries. */
export function parseAspects(aspects: readonly string[]): AspectChoice[] {
	const choices: AspectChoice[] = [];
	for (const raw of aspects) {
		const choice = parseAspect(raw);
		if (choice) {
			choices.push(choice);
		}
	}
	return choices.length > 0 ? choices : [{ label: "free", ratio: undefined }];
}

function parseAspect(raw: string): AspectChoice | undefined {
	if (raw === "free") {
		return { label: raw, ratio: undefined };
	}
	const [w, h] = raw.split(":").map(Number);
	if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
		return undefined;
	}
	return { label: raw, ratio: w / h };
}

/** True when the dialog should open for this file: a raster image the browser can redraw. */
export function isCroppable(file: File): boolean {
	return file.type.startsWith("image/") && !PASSTHROUGH_TYPES.has(file.type);
}
