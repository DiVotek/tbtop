// Maps a wire shape variant to its Tailwind rounding class.
export function imageShapeClass(shape: unknown): string {
	if (shape === "circular") {
		return "rounded-full";
	}
	if (shape === "rounded") {
		return "rounded-lg";
	}
	return "rounded-none";
}
