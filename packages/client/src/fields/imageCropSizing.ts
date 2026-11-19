export interface CropSize {
	width: number;
	height: number;
}

export function freeCropSize(media: CropSize | undefined, percent: CropSize): CropSize | undefined {
	if (!media || media.width <= 0 || media.height <= 0) {
		return;
	}
	return {
		width: (media.width * percent.width) / 100,
		height: (media.height * percent.height) / 100,
	};
}
