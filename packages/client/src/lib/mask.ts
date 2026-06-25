// Static pattern mask, Filament token alphabet:
//   9 = digit, a = letter, * = alphanumeric; any other char is a literal.
const TOKENS: Record<string, RegExp> = {
	"9": /[0-9]/,
	a: /[a-zA-Z]/,
	"*": /[a-zA-Z0-9]/,
};

export function applyMask(input: string, pattern: string): string {
	if (input === "" || pattern === "") {
		return input;
	}
	let result = "";
	let cursor = 0;
	for (const slot of pattern) {
		const token = TOKENS[slot];
		if (!token) {
			result += slot;
			continue;
		}
		let ch = input[cursor];
		while (ch !== undefined && !token.test(ch)) {
			cursor++;
			ch = input[cursor];
		}
		if (ch === undefined) {
			break;
		}
		result += ch;
		cursor++;
	}
	return result;
}
