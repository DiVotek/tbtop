import type { Cell } from "./cell";

const FORMULA_START = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** A text cell a spreadsheet would run as a formula gets a leading apostrophe. */
function guard(cell: Cell): string {
	if (typeof cell !== "string") {
		return String(cell);
	}
	return cell !== "" && FORMULA_START.has(cell[0] ?? "") ? `'${cell}` : cell;
}

/** RFC 4180 quoting, as PHP's fputcsv with an empty escape char writes it. */
function field(text: string): string {
	return /[",\r\n\t ]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV lines (CsvWriter.php): UTF-8 BOM, comma separated, CRLF. */
export async function* csvChunks(
	headers: string[],
	rows: AsyncIterable<Cell[][]>,
): AsyncGenerator<string> {
	yield `\u{FEFF}${line(headers)}`;
	for await (const chunk of rows) {
		yield chunk.map(line).join("");
	}
}

function line(cells: Cell[]): string {
	return `${cells.map((c) => field(guard(c))).join(",")}\r\n`;
}
