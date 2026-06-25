// Maps a wire shape variant to its Tailwind rounding class for color swatches.
// Unset defaults to rounded corners.
export function colorShapeClass(shape: unknown): string {
	if (shape === "circular") {
		return "rounded-full";
	}
	if (shape === "square") {
		return "rounded-none";
	}
	return "rounded-md";
}
