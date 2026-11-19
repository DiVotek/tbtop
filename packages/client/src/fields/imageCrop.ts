export interface CropArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

const CROPPABLE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isCroppable(file: File): boolean {
	return CROPPABLE_TYPES.has(file.type);
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Image decoding failed"));
		image.src = url;
	});
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob || blob.type !== type) {
					reject(new Error("Image encoding failed"));
					return;
				}
				resolve(blob);
			},
			type,
			0.92,
		);
	});
}

export async function cropImage(file: File, area: CropArea): Promise<File> {
	const url = URL.createObjectURL(file);
	try {
		const image = await loadImage(url);
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(area.width));
		canvas.height = Math.max(1, Math.round(area.height));
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas is unavailable");
		}
		context.drawImage(
			image,
			area.x,
			area.y,
			area.width,
			area.height,
			0,
			0,
			canvas.width,
			canvas.height,
		);
		return new File([await encode(canvas, file.type)], file.name, { type: file.type });
	} finally {
		URL.revokeObjectURL(url);
	}
}
