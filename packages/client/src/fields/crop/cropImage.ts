/** Pixel rectangle on the source image, as react-easy-crop reports it. */
export interface PixelArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Types canvas.toBlob encodes everywhere; anything else is written as PNG. */
const ENCODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITY = 0.92;

/** Cuts `area` out of `file` and returns it as a new File, same name and (where encodable) type. */
export async function cropImage(file: File, area: PixelArea): Promise<File> {
	const bitmap = await createImageBitmap(file);
	try {
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(area.width));
		canvas.height = Math.max(1, Math.round(area.height));
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Canvas 2D context is unavailable");
		}
		ctx.drawImage(
			bitmap,
			area.x,
			area.y,
			area.width,
			area.height,
			0,
			0,
			canvas.width,
			canvas.height,
		);
		const type = ENCODABLE.has(file.type) ? file.type : "image/png";
		const blob = await toBlob(canvas, type);
		return new File([blob], renameFor(file.name, type), { type, lastModified: Date.now() });
	} finally {
		bitmap.close();
	}
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error("Could not encode the cropped image")),
			type,
			QUALITY,
		);
	});
}

/** Keeps the name; swaps the extension only when the type changed to PNG. */
export function renameFor(name: string, type: string): string {
	if (type !== "image/png" || /\.png$/i.test(name)) {
		return name;
	}
	const dot = name.lastIndexOf(".");
	return `${dot > 0 ? name.slice(0, dot) : name}.png`;
}
