export function slugify(raw: string): string {
	const folded = raw.normalize("NFKD").replaceAll(/[̀-ͯ]/g, "");
	return folded
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-+|-+$/g, "");
}
