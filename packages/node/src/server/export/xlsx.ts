import type { Cell } from "./cell";
import { SHEET_CLOSE, SHEET_OPEN, XLSX_PARTS } from "./xlsxParts";
import { ZipWriter } from "./zip";

/** Excel's per-cell character limit. */
const MAX_CELL = 32767;

const INVALID_XML =
	/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu;

function text(value: string): string {
	return [...value.replace(INVALID_XML, "")]
		.slice(0, MAX_CELL)
		.join("")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function rowXml(cells: Cell[], style: string): string {
	const xml = cells.map((cell) =>
		typeof cell === "number" && Number.isFinite(cell)
			? `<c${style}><v>${cell}</v></c>`
			: `<c${style} t="inlineStr"><is><t xml:space="preserve">${text(String(cell))}</t></is></c>`,
	);
	return `<row>${xml.join("")}</row>`;
}

async function* once(value: string): AsyncGenerator<Uint8Array> {
	yield new TextEncoder().encode(value);
}

async function* sheet(
	headers: string[],
	rows: AsyncIterable<Cell[][]>,
): AsyncGenerator<Uint8Array> {
	const encoder = new TextEncoder();
	yield encoder.encode(SHEET_OPEN + rowXml(headers, ' s="1"'));
	for await (const chunk of rows) {
		yield encoder.encode(chunk.map((cells) => rowXml(cells, "")).join(""));
	}
	yield encoder.encode(SHEET_CLOSE);
}

/** A single-sheet XLSX (XlsxWriter.php): inline strings, numbers as numbers, bold frozen header. */
export async function* xlsxChunks(
	headers: string[],
	rows: AsyncIterable<Cell[][]>,
): AsyncGenerator<Uint8Array> {
	const zip = new ZipWriter();
	for (const [name, xml] of Object.entries(XLSX_PARTS)) {
		yield* zip.entry(name, once(xml));
	}
	yield* zip.entry("xl/worksheets/sheet1.xml", sheet(headers, rows));
	yield* zip.finish();
}
