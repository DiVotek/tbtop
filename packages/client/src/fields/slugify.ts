// Ukrainian/Russian Cyrillic -> Latin transliteration. Applied before NFKD
// folding so Cyrillic text (which NFKD does not decompose) produces a
// readable slug instead of collapsing to an empty string.
const CYRILLIC_MAP: Record<string, string> = {
	ї: "yi",
	є: "ye",
	і: "i",
	ґ: "g",
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "yo",
	ж: "zh",
	з: "z",
	и: "i",
	й: "j",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
};

function transliterate(lower: string): string {
	let out = "";
	for (const char of lower) {
		out += CYRILLIC_MAP[char] ?? char;
	}
	return out;
}

export function slugify(raw: string): string {
	const transliterated = transliterate(raw.toLowerCase());
	const folded = transliterated.normalize("NFKD").replaceAll(/[̀-ͯ]/g, "");
	return folded
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-+|-+$/g, "");
}
