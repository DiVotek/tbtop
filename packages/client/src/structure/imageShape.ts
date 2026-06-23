// Maps a wire shape variant to its Tailwind rounding class.
export function imageShapeClass(shape: unknown): string {
	return shape === "circular" ? "rounded-full" : "rounded-none";
}
